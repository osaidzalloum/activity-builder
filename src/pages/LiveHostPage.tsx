import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import { QUESTION_TIME_LIMIT_MS } from "../constants";
import { answerEventSchema, liveSessionSchema, questionsSchema } from "../schemas";
import { buildLeaderboard } from "../utils/buildLeaderboard";
import { scoreQuestion, sumScores } from "../utils/scoreQuestion";
import { summarizeAnswers } from "../utils/summarizeAnswers";
import { toPublicQuestion } from "../utils/toPublicQuestion";
import { buildRevealSummary } from "../utils/buildRevealSummary";
import { buildFinalSummary } from "../utils/buildFinalSummary";
import useLiveChannel from "../hooks/useLiveChannel";
import useHostSnapshot from "../hooks/useHostSnapshot";
import useOnNewPlayers from "../hooks/useOnNewPlayers";
import { MAX_POINTS, MIN_CORRECT_POINTS } from "../utils/calculateScore";
import type {
  FinalEvent,
  LiveSession,
  McqQuestion,
  Question,
  QuestionEvent,
  RevealEvent,
  SessionState,
  ScoringMode
} from "../types";

type LoadStatus = "loading" | "ready" | "not-found" | "error";

const LiveHostPage = () => {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [snapshot, setSnapshot] = useHostSnapshot(status === "ready" ? code : undefined);
  const { answers, scores } = snapshot;
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      const { data, error } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("code", code ?? "")
        .maybeSingle();

      if (ignore) return;
      if (error || !data) {
        if (error) console.error(error);
        setStatus(error ? "error" : "not-found");
        return;
      }

      const parsedSession = liveSessionSchema.safeParse(data);
      if (!parsedSession.success) {
        console.error(parsedSession.error.issues);
        setStatus("error");
        return;
      }

      const { data: activity, error: activityError } = await supabase
        .from("activities")
        .select("questions")
        .eq("id", parsedSession.data.activity_id)
        .maybeSingle();

      if (ignore) return;
      if (activityError || !activity) {
        console.error(activityError);
        setStatus("error");
        return;
      }

      const parsedQuestions = questionsSchema.safeParse(activity.questions);
      if (!parsedQuestions.success) {
        console.error(parsedQuestions.error.issues);
        setStatus("error");
        return;
      }

      setSession(parsedSession.data);
      setQuestions(parsedQuestions.data);
      setStatus("ready");
    }

    load();
    return () => { ignore = true; };
  }, [code]);

  function handleBroadcast(event: string, payload: unknown) {
    if (event !== "answer") return;
    // read the clock once, outside the state updater (updaters must stay pure)
    const receivedAt = Date.now();

    // students are untrusted: validate every answer
    const parsed = answerEventSchema.safeParse(payload);
    if (!parsed.success) return;
    const { playerId, index, choice } = parsed.data;

    // accept answers only for the question that is currently open
    const currentState = session?.state;
    if (currentState?.status !== "question" || currentState.index !== index) return;

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
    status === "ready" ? code : undefined,
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
    if (!session) return;
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
      const syncBoard = buildLeaderboard(players, sumScores(snapshot.scores));
      const { top, results } = buildRevealSummary(syncBoard, snapshot.scores[s.index] ?? {});
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
  if (status === "loading") return <p>جاري التحميل...</p>;
  if (status === "not-found") return <p>الجلسة غير موجودة.</p>;
  if (status === "error" || !session) return <p>صار خطأ أثناء تحميل الجلسة.</p>;

  const state = session.state;
  const scoringMode = session.scoring_mode;
  const isOpen = state.status === "question";
  const isRevealed = state.status === "reveal";
  const isFinished = state.status === "finished";
  const currentIndex = isOpen || isRevealed ? state.index : -1;
  const current = publicQuestions[currentIndex] ?? null;
  const currentLive = liveQuestions[currentIndex] ?? null;
  const nextIndex = currentIndex + 1;
  const hasMore = nextIndex < publicQuestions.length;
  const skipped = questions.length - liveQuestions.length;

  const answersForCurrent = answers[currentIndex] ?? {};
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
  const hasScores = Object.keys(scores).length > 0;

  // 1. save the state first, so a student who refreshes can recover it
  // 2. then notify the students
  // onlyFrom makes the move conditional in the database
  async function changeState(
    newState: SessionState,
    event: string,
    payload: unknown,
    onlyFrom?: SessionState["status"],
    ending = false
  ): Promise<boolean> {
    if (!session) return false;
    setBusy(true);
    setActionError("");

    const endedAt = ending ? new Date().toISOString() : null;

    let query = supabase
      .from("live_sessions")
      .update(endedAt ? { state: newState, ended_at: endedAt } : { state: newState })
      .eq("id", session.id);

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
    setSession({ ...session, state: newState, ended_at: endedAt ?? session.ended_at });

    const sent = await send(event, payload);
    if (!sent) setActionError("انحفظ التحديث بس البث للطلاب فشل.");
    setBusy(false);
    return true;
  }

  async function handleScoringChange(mode: ScoringMode) {
    if (!session || session.state.status !== "lobby") return;
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
    changeState({ status: "question", index: nextIndex, startedAt }, "question", payload);
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
      scoringMode,
    );

    // overwrite, don't add: a retry gives the same totals
    const nextScores = { ...scores, [index]: questionScores };
    const nextBoard = buildLeaderboard(players, sumScores(nextScores));
    const { top, results } = buildRevealSummary(nextBoard, questionScores);

    // the correct answer leaves the host only now, after answers are closed
    const payload: RevealEvent = {
      index,
      correctIndex: currentLive.correctIndex,
      top,
      results,
    };
    const moved = await changeState({
      status: "reveal",
      index,
      startedAt
    }, "reveal", payload, "question");
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
    await changeState({ status: "finished" }, "finished", payload, undefined, true);
  }

  return (
    <div>
      <Link to="/" className="back-link">→ أنشطتي</Link>

      <div className="card">
        <p className="hint">كود الانضمام</p>
        <h1 style={{ letterSpacing: 6 }}>{session.code}</h1>
        <p className="hint">
          الطلاب بيفتحوا <strong>{window.location.origin}/join</strong> وبيكتبوا الكود
        </p>
      </div>

      {skipped > 0 && (
        <p className="hint">
          {skipped} سؤال (ترتيب أو مطابقة) مش مدعوم بالجلسات الحية، فانتخطى.
        </p>
      )}

      {isFinished ? (
        <div className="card">
          <h2>انتهت الجلسة 🎉</h2>
          <p className="hint">الترتيب النهائي بالأسفل.</p>
          <Link className="btn btn-primary" to="/">العودة لأنشطتي</Link>
        </div>
      ) : publicQuestions.length === 0 ? (
        <p className="error">هذا النشاط ما فيه أسئلة اختيار من متعدد.</p>
      ) : (
        <div className="card">
          {current && currentLive ? (
            <>
              <p className="hint">
                السؤال {currentIndex + 1} من {publicQuestions.length}
                {" · "}
                جاوب {answeredCount} من {players.length}
              </p>
              <h2>{current.text}</h2>
              <ul className="options">
                {current.options.map((option, i) => (
                  <li
                    key={i}
                    className={isRevealed && i === currentLive.correctIndex ? "correct-answer" : ""}
                  >
                    {option} <span className="hint">({countFor(i)})</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>لسا ما بدأت الأسئلة.</p>
          )}
          {state.status === "lobby" ? (
            <fieldset className="scoring" disabled={busy}>
              <legend>طريقة النقاط</legend>
              <label>
                <input
                  type="radio"
                  name="scoring"
                  checked={scoringMode === "fixed"}
                  onChange={() => handleScoringChange("fixed")}
                />{" "}
                ثابتة: كل إجابة صحيحة {MAX_POINTS} نقطة
              </label>
              <label>
                <input
                  type="radio"
                  name="scoring"
                  checked={scoringMode === "speed"}
                  onChange={() => handleScoringChange("speed")}
                />{" "}
                مع مكافأة سرعة: من {MIN_CORRECT_POINTS} إلى {MAX_POINTS} حسب سرعة الإجابة
              </label>
            </fieldset>
          ) : (
            <p className="hint">
              النقاط: {scoringMode === "fixed" ? "ثابتة" : "مع مكافأة سرعة"}
            </p>
          )}

          <div className="actions">
            {isOpen && (
              <button className="btn btn-primary" onClick={handleReveal} disabled={busy}>
                اكشف الجواب
              </button>
            )}
            {hasMore ? (
              <button className="btn" onClick={handleNext} disabled={busy}>
                {busy
                  ? "جاري الإرسال..."
                  : currentIndex < 0
                    ? "ابدأ: السؤال الأول"
                    : "السؤال التالي"}
              </button>
            ) : (
              currentIndex >= 0 && <p className="hint">هذا آخر سؤال.</p>
            )}
            {!isOpen && (
              <button className="btn btn-delete" onClick={handleFinish} disabled={busy}>
                أنهِ الجلسة
              </button>
            )}
          </div>
          {actionError && <p className="error">{actionError}</p>}
        </div>
      )}

      {hasScores && (
        <>
          <h2>لوحة الترتيب</h2>
          <ol className="leaderboard">
            {board.map((entry) => (
              <li key={entry.id}>
                <span>{entry.rank}</span> <strong>{entry.name}</strong>{" "}
                <span className="hint">{entry.points}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      <h2>المتصلون ({players.length})</h2>
      {players.length === 0 ? (
        <p>لسا ما حدا انضم.</p>
      ) : (
        <ul>
          {players.map((p) => (
            <li key={p.id}>
              {p.name}
              {isOpen && Object.hasOwn(answersForCurrent, p.id) ? " ✓" : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LiveHostPage;