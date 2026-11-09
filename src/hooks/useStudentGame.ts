import { useEffect, useRef, useState } from "react";
import {
  finalEventSchema,
  participantSchema,
  questionEventSchema,
  revealEventSchema,
} from "../schemas";
import { checkSession } from "../lib/joinSession";
import { clearStoredPlayer, loadStoredPlayer, saveStoredPlayer } from "../lib/playerStorage";
import useLiveChannel from "./useLiveChannel";
import type { AnswerEvent, FinalEvent, QuestionEvent, RevealEvent } from "../types";

type Joined = { code: string; name: string };

// Everything the student's screen needs, so the page only has to draw it.
export default function useStudentGame() {
  // read once: after a refresh the same player comes back with the same identity
  const [stored] = useState(loadStoredPlayer);
  const [playerId] = useState(() => stored?.playerId ?? crypto.randomUUID());
  const [restoring, setRestoring] = useState(stored !== null);

  const [joined, setJoined] = useState<Joined | null>(null);
  const [current, setCurrent] = useState<QuestionEvent | null>(null);
  const [answer, setAnswer] = useState<{ index: number; choice: number } | null>(
    () => stored?.answer ?? null
  );
  // the handler below is created before the channel exists, so it reaches `send` through a ref
  const sendRef = useRef<((event: string, payload: unknown) => Promise<boolean>) | null>(null);
  const [revealed, setRevealed] = useState<RevealEvent | null>(null);
  const [final, setFinal] = useState<FinalEvent | null>(null);
  const [answerError, setAnswerError] = useState("");

  // derived, not stored: an answer belongs to its question,
  // so a repeated or older event can never reset it
  const selected = current && answer?.index === current.index ? answer.choice : null;

  // bring the player back after a refresh, but only if the session is still running
  useEffect(() => {
    if (!stored) return;
    const { code: storedCode, name: storedName } = stored;
    let ignore = false;

    async function restore() {
      const result = await checkSession(storedCode);
      if (ignore) return;

      if (result === "active") {
        setJoined({ code: storedCode, name: storedName });
      } else if (result === "not-found") {
        // ended or gone: back to the form
        clearStoredPlayer();
      }
      // on "error" keep the stored player, so the next refresh can try again
      setRestoring(false);
    }

    restore();
    return () => { ignore = true; };
  }, [stored]);

  function handleBroadcast(event: string, payload: unknown) {
    // data from the channel is untrusted: validate before using it
    if (event === "question") {
      const parsed = questionEventSchema.safeParse(payload);
      if (!parsed.success) {
        console.error(parsed.error.issues);
        return;
      }
      const incoming = parsed.data;
      // the host repeats the current question for late joiners: the same question changes
      // nothing, and an older one never replaces a newer one
      setCurrent((prev) => (prev && prev.index >= incoming.index ? prev : incoming));
      setAnswerError("");
      // the host may have lost this student's answer (it was reopened on another device, or its
      // data was cleared), so send it again. Safe to repeat: the host keeps only the first answer.
      if (answer?.index === incoming.index) {
        const resend: AnswerEvent = { playerId, index: incoming.index, choice: answer.choice };
        void sendRef.current?.("answer", resend);
      }
    } else if (event === "reveal") {
      const parsed = revealEventSchema.safeParse(payload);
      if (!parsed.success) {
        console.error(parsed.error.issues);
        return;
      }
      const incoming = parsed.data;
      // the first reveal of a question wins, so a repeat can't change the rank on screen
      setRevealed((prev) => (prev?.index === incoming.index ? prev : incoming));
    } else if (event === "finished") {
      const parsed = finalEventSchema.safeParse(payload);
      if (!parsed.success) {
        console.error(parsed.error.issues);
        return;
      }
      setFinal(parsed.data);
      clearStoredPlayer();
    }
  }

  const { participants, send, failed } = useLiveChannel(
    joined?.code,
    playerId,
    joined?.name,
    "player",
    handleBroadcast
  );
  useEffect(() => {
    sendRef.current = send;
  }, [send]);
  const players = participants.filter((p) => p.role === "player");
  const hostConnected = participants.some((p) => p.role === "host");

  // resolves to an error message, or to null when the student has joined
  async function join(rawCode: string, rawName: string): Promise<string | null> {
    const code = rawCode.trim().toUpperCase();
    const nameResult = participantSchema.shape.name.safeParse(rawName);

    if (code.length !== 6) return "الكود لازم يكون 6 خانات.";
    if (!nameResult.success) return "اكتب اسمك (حتى 50 حرف).";

    const result = await checkSession(code);
    if (result === "error") return "صار خطأ، حاول مرة ثانية.";
    if (result === "not-found") return "الكود غير صحيح، أو الجلسة انتهت.";

    // a new join starts clean: an answer from an earlier session must not leak in
    setAnswer(null);
    saveStoredPlayer({ code, name: nameResult.data, playerId });
    setJoined({ code, name: nameResult.data });
    return null;
  }

  async function handleChoose(choice: number) {
    if (!joined || !current || selected !== null) return;
    const questionIndex = current.index;
    setAnswer({ index: questionIndex, choice });
    setAnswerError("");

    const payload: AnswerEvent = { playerId, index: questionIndex, choice };
    const sent = await send("answer", payload);
    if (!sent) {
      // let the student try again
      setAnswer(null);
      setAnswerError("ما وصل جوابك، حاول مرة ثانية.");
      return;
    }

    // remember only answers the server confirmed, so a refresh shows what was really sent
    saveStoredPlayer({
      code: joined.code,
      name: joined.name,
      playerId,
      answer: { index: questionIndex, choice },
    });
  }

  function handleLeave() {
    clearStoredPlayer();
    // a reload gives the next player on this device a fresh identity
    window.location.reload();
  }

  // the reveal belongs to the current question only
  const reveal = current && revealed?.index === current.index ? revealed : null;
  // a player who joined after the board was built has no entry
  const myResult =
    reveal && Object.hasOwn(reveal.results, playerId) ? reveal.results[playerId] : null;
  const myFinal = final && Object.hasOwn(final.results, playerId) ? final.results[playerId] : null;

  return {
    restoring,
    joined,
    // the question
    current,
    selected,
    reveal,
    myResult,
    answerError,
    // the end
    final,
    myFinal,
    // who is here
    players,
    hostConnected,
    // true while the live channels cannot be joined
    connectionFailed: failed,
    // what the student can do
    join,
    handleChoose,
    handleLeave,
  };
}