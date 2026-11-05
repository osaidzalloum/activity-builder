import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import { QUESTION_TIME_LIMIT_MS } from "../constants";
import { answerEventSchema } from "../schemas";
import { buildFinalSummary } from "../utils/buildFinalSummary";
import { buildLeaderboard } from "../utils/buildLeaderboard";
import { buildRevealSummary } from "../utils/buildRevealSummary";
import { buildSessionResults } from "../utils/buildSessionResults";
import { scoreQuestion, sumScores } from "../utils/scoreQuestion";
import { summarizeAnswers } from "../utils/summarizeAnswers";
import { toPublicQuestion } from "../utils/toPublicQuestion";
import useHostSnapshot from "./useHostSnapshot";
import useLiveChannel from "./useLiveChannel";
import useOnNewPlayers from "./useOnNewPlayers";
import type {
  FinalEvent,
  LiveSession,
  McqQuestion,
  Question,
  QuestionEvent,
  RevealEvent,
  ScoringMode,
  SessionResults,
  SessionState,
} from "../types";

type StateChange = {
  newState: SessionState;
  event: string;
  payload: unknown;
  // makes the move conditional in the database
  onlyFrom?: SessionState["status"];
  ending?: boolean;
  // saved in the same request as the new state
  results?: SessionResults;
};

// Everything the host's screen needs, so the page only has to draw it.
// Runs only once the session is loaded, so session is never null here.
export default function useHostGame(initialSession: LiveSession, questions: Question[]) {
  const { user } = useAuth();

  const [session, setSession] = useState(initialSession);
  const [snapshot, setSnapshot] = useHostSnapshot(session.code);
  const { answers, scores } = snapshot;
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  function handleBroadcast(event: string, payload: unknown) {
    if (event !== "answer") return;
    // read the clock once, outside the state updater (updaters must stay pure)
    const receivedAt = Date.now();

    // students are untrusted: validate every answer
    const parsed = answerEventSchema.safeParse(payload);
    if (!parsed.success) return;
    const { playerId, index, choice } = parsed.data;

    // accept answers only for the question that is currently open
    const currentState = session.state;
    if (currentState.status !== "question" || currentState.index !== index) return;

    // prev, not the closure: two answers arriving together must both survive
    setSnapshot((prev) => {
      const forQuestion = prev.answers[index] ?? {};
      if (Object.hasOwn(forQuestion, playerId)) return prev; // first answer wins
      return {
        ...prev,
        answers: {
          ...prev.answers,
          [index]: { ...forQuestion, [playerId]: { choice, receivedAt } },
        },
      };
    });
  }

  const { participants, send } = useLiveChannel(
    session.code,
    user?.id,
    "Host",
    "host",
    handleBroadcast
  );
  const players = participants.filter((p) => p.role === "player");

  // live sessions support multiple choice only (for now)
  const liveQuestions = useMemo(
    () => questions.filter((q): q is McqQuestion => q.type === "mcq"),
    [questions]
  );
  // same order and length as liveQuestions, but without the answers
  const publicQuestions = useMemo(
    () =>
      liveQuestions.flatMap((q) => {
        const publicQuestion = toPublicQuestion(q);
        return publicQuestion ? [publicQuestion] : [];
      }),
    [liveQuestions]
  );

  // a student who joined late or refreshed gets the current state again;
  // students who already have it ignore the repeat
  async function sendSync() {
    const s = session.state;
    if (s.status !== "question" && s.status !== "reveal") return;

    const question = publicQuestions[s.index];
    if (!question) return;

    const questionEvent: QuestionEvent = {
      index: s.index,
      total: publicQuestions.length,
      startedAt: s.startedAt,
      scoring: session.scoring_mode,
      question,
    };
    await send("question", questionEvent);

    if (s.status === "reveal") {
      const live = liveQuestions[s.index];
      if (!live) return;
      // rebuilt from the saved scores, so it works even after the host refreshed
      const syncBoard = buildLeaderboard(players, sumScores(scores));
      const { top, results } = buildRevealSummary(syncBoard, scores[s.index] ?? {});
      const revealEvent: RevealEvent = {
        index: s.index,
        correctIndex: live.correctIndex,
        top,
        results,
      };
      await send("reveal", revealEvent);
    }
  }

  useOnNewPlayers(
    players.map((p) => p.id),
    sendSync
  );

  const state = session.state;
  const scoringMode = session.scoring_mode;
  const savedNames = session.results.players;
  const isOpen = state.status === "question";
  const isRevealed = state.status === "reveal";
  const currentIndex = isOpen || isRevealed ? state.index : -1;
  const current = publicQuestions[currentIndex] ?? null;
  const currentLive = liveQuestions[currentIndex] ?? null;
  const nextIndex = currentIndex + 1;
  const hasMore = nextIndex < publicQuestions.length;

  const answersForCurrent = answers[currentIndex] ?? {};
  const answeredIds = new Set<string>(isOpen ? Object.keys(answersForCurrent) : []);
  const choices = Object.fromEntries(
    Object.entries(answersForCurrent).map(([id, a]) => [id, a.choice])
  );
  const { answeredCount, countFor } = summarizeAnswers(
    players,
    choices,
    current?.options.length ?? 0
  );

  // totals and ranking are derived: nothing here can be counted twice
  const board = buildLeaderboard(players, sumScores(scores));

  // 1. save the state first, so a student who refreshes can recover it
  // 2. then notify the students
  async function changeState({
    newState,
    event,
    payload,
    onlyFrom,
    ending = false,
    results,
  }: StateChange): Promise<boolean> {
    setBusy(true);
    setActionError("");

    const endedAt = ending ? new Date().toISOString() : null;
    const changes = {
      state: newState,
      ...(results ? { results } : {}),
      ...(endedAt ? { ended_at: endedAt } : {}),
    };

    let query = supabase.from("live_sessions").update(changes).eq("id", session.id);

    if (onlyFrom) query = query.eq("state->>status", onlyFrom);
    // a session can only be ended once
    if (ending) query = query.is("ended_at", null);

    const { data, error } = await query.select("id");

    if (error) {
      console.error(error);
      setActionError(`ما قدرنا نحدّث الجلسة: ${error.message}`);
      setBusy(false);
      return false;
    }
    if (!data || data.length === 0) {
      console.error("Update changed 0 rows: blocked by RLS or by the condition");
      setActionError("ما قدرنا نحدّث الجلسة: ما في صلاحية للتعديل.");
      setBusy(false);
      return false;
    }
    setSession({
      ...session,
      state: newState,
      results: results ?? session.results,
      ended_at: endedAt ?? session.ended_at,
    });

    const sent = await send(event, payload);
    if (!sent) setActionError("انحفظ التحديث بس البث للطلاب فشل.");
    setBusy(false);
    return true;
  }

  async function handleScoringChange(mode: ScoringMode) {
    if (session.state.status !== "lobby") return;
    setBusy(true);
    setActionError("");

    // only while the session is still in the lobby: the mode cannot change once scoring started
    const { data, error } = await supabase
      .from("live_sessions")
      .update({ scoring_mode: mode })
      .eq("id", session.id)
      .eq("state->>status", "lobby")
      .select("id");

    if (error || !data || data.length === 0) {
      console.error(error);
      setActionError("ما قدرنا نغيّر طريقة النقاط.");
      setBusy(false);
      return;
    }
    setSession({ ...session, scoring_mode: mode });
    setBusy(false);
  }

  function handleNext() {
    if (!hasMore) return;
    const startedAt = Date.now();
    const payload: QuestionEvent = {
      index: nextIndex,
      total: publicQuestions.length,
      startedAt,
      scoring: scoringMode,
      question: publicQuestions[nextIndex],
    };
    changeState({
      newState: { status: "question", index: nextIndex, startedAt },
      event: "question",
      payload,
    });
  }

  async function handleReveal() {
    if (state.status !== "question" || !currentLive) return;
    const { index, startedAt } = state;
    // the answers that arrived by the moment the teacher clicked
    const answersAtClick = answers[index] ?? {};

    const questionScores = scoreQuestion(
      answersAtClick,
      currentLive.correctIndex,
      startedAt,
      QUESTION_TIME_LIMIT_MS,
      scoringMode
    );

    // overwrite, don't add: a retry gives the same totals
    const nextScores = { ...scores, [index]: questionScores };
    const nextBoard = buildLeaderboard(players, sumScores(nextScores));
    // what each student sees: their own gain, total and rank, plus the top five
    const { top, results: playerResults } = buildRevealSummary(nextBoard, questionScores);

    // the correct answer leaves the host only now, after answers are closed
    const payload: RevealEvent = {
      index,
      correctIndex: currentLive.correctIndex,
      top,
      results: playerResults,
    };

    // what is saved: the whole record is rebuilt from what the host holds,
    // so a retry overwrites instead of adding
    const sessionResults = buildSessionResults(
      liveQuestions,
      answers,
      nextScores,
      players,
      savedNames
    );

    const moved = await changeState({
      newState: { status: "reveal", index, startedAt },
      event: "reveal",
      payload,
      onlyFrom: "question",
      results: sessionResults,
    });
    if (!moved) return;

    setSnapshot((prev) => ({
      ...prev,
      scores: { ...prev.scores, [index]: questionScores },
    }));
  }

  async function handleFinish() {
    if (state.status === "finished" || state.status === "question") return;
    if (!confirm("متأكد بدك تنهي الجلسة؟ الطلاب ما رح يقدروا ينضموا بعدها.")) return;

    const payload: FinalEvent = buildFinalSummary(board);
    // refresh the names of whoever is connected at the end
    const results = buildSessionResults(liveQuestions, answers, scores, players, savedNames);
    await changeState({
      newState: { status: "finished" },
      event: "finished",
      payload,
      ending: true,
      results,
    });
  }

  return {
    session,
    scoringMode,
    busy,
    actionError,
    // who is here, and the standings
    players,
    board,
    hasScores: Object.keys(scores).length > 0,
    answeredIds,
    // where the session is
    isLobby: state.status === "lobby",
    isOpen,
    isRevealed,
    isFinished: state.status === "finished",
    // the current question: current is what students see, currentLive also has the answer
    current,
    currentLive,
    currentIndex,
    totalQuestions: publicQuestions.length,
    skipped: questions.length - liveQuestions.length,
    hasMore,
    answeredCount,
    countFor,
    // what the teacher can do
    handleScoringChange,
    handleNext,
    handleReveal,
    handleFinish,
  };
}