import { useEffect, useState, type FormEvent } from "react";
import {
  finalEventSchema,
  participantSchema,
  questionEventSchema,
  revealEventSchema,
} from "../schemas";
import { checkSession } from "../lib/joinSession";
import { clearStoredPlayer, loadStoredPlayer, saveStoredPlayer } from "../lib/playerStorage";
import useLiveChannel from "../hooks/useLiveChannel";
import type { AnswerEvent, FinalEvent, QuestionEvent, RevealEvent } from "../types";

type Joined = { code: string; name: string };

function JoinPage() {
  // read once: after a refresh the same player comes back with the same identity
  const [stored] = useState(loadStoredPlayer);
  const [playerId] = useState(() => stored?.playerId ?? crypto.randomUUID());
  const [restoring, setRestoring] = useState(stored !== null);

  const [codeInput, setCodeInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [joined, setJoined] = useState<Joined | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [current, setCurrent] = useState<QuestionEvent | null>(null);
  const [answer, setAnswer] = useState<{ index: number; choice: number } | null>(null);
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

  const { participants, send } = useLiveChannel(
    joined?.code,
    playerId,
    joined?.name,
    "player",
    handleBroadcast
  );
  const players = participants.filter((p) => p.role === "player");
  const hostConnected = participants.some((p) => p.role === "host");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const code = codeInput.trim().toUpperCase();
    const nameResult = participantSchema.shape.name.safeParse(nameInput);

    if (code.length !== 6) {
      setError("الكود لازم يكون 6 خانات.");
      return;
    }
    if (!nameResult.success) {
      setError("اكتب اسمك (حتى 50 حرف).");
      return;
    }

    setSubmitting(true);
    const result = await checkSession(code);
    setSubmitting(false);

    if (result === "error") {
      setError("صار خطأ، حاول مرة ثانية.");
      return;
    }
    if (result === "not-found") {
      setError("الكود غير صحيح، أو الجلسة انتهت.");
      return;
    }

    saveStoredPlayer({ code, name: nameResult.data, playerId });
    setJoined({ code, name: nameResult.data });
  }

  async function handleChoose(choice: number) {
    if (!current || selected !== null) return;
    setAnswer({ index: current.index, choice });
    setAnswerError("");

    const payload: AnswerEvent = { playerId, index: current.index, choice };
    const sent = await send("answer", payload);
    if (!sent) {
      // let the student try again
      setAnswer(null);
      setAnswerError("ما وصل جوابك، حاول مرة ثانية.");
    }
  }

  function handleLeave() {
    clearStoredPlayer();
    // a reload gives the next player on this device a fresh identity
    window.location.reload();
  }

  if (restoring) return <p>جاري استعادة جلستك...</p>;

  if (joined) {
    if (final) {
      const mine = Object.hasOwn(final.results, playerId) ? final.results[playerId] : null;

      return (
        <div className="card">
          <h1>انتهت الجلسة 🎉</h1>
          {mine && (
            <p>
              مجموعك <strong>{mine.total}</strong> · المرتبة <strong>{mine.rank}</strong>
            </p>
          )}
          {final.top.length > 0 && (
            <>
              <h3>الأوائل</h3>
              <ol className="leaderboard">
                {final.top.map((e, i) => (
                  <li key={i}>
                    <span>{e.rank}</span> <strong>{e.name}</strong>{" "}
                    <span className="hint">{e.points}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          <button className="btn" onClick={handleLeave}>جلسة جديدة</button>
        </div>
      );
    }

    // the reveal belongs to the current question only
    const reveal = current && revealed?.index === current.index ? revealed : null;
    // a player who joined after the board was built has no entry
    const myResult =
      reveal && Object.hasOwn(reveal.results, playerId) ? reveal.results[playerId] : null;

    return (
      <div>
        {current ? (
          <div className="card play-container">
            <p className="hint">
              السؤال {current.index + 1} من {current.total}
            </p>
            <h2>{current.question.text}</h2>
            <ul className="options">
              {current.question.options.map((option, i) => {
                let className = "play-option";
                if (reveal) {
                  if (i === reveal.correctIndex) className += " correct";
                  else if (i === selected) className += " wrong";
                } else if (i === selected) {
                  className += " active";
                }
                return (
                  <li key={i}>
                    <button
                      className={className}
                      onClick={() => handleChoose(i)}
                      disabled={selected !== null || reveal !== null}
                    >
                      {option}
                    </button>
                  </li>
                );
              })}
            </ul>

            {answerError && <p className="error">{answerError}</p>}
            {!reveal && selected !== null && (
              <p className="hint">وصل جوابك، بانتظار المعلم...</p>
            )}
            {reveal && (
              <p>
                {selected === null
                  ? "ما جاوبت على هذا السؤال."
                  : selected === reveal.correctIndex
                    ? "✅ إجابة صحيحة"
                    : "❌ إجابة خاطئة"}
              </p>
            )}

            {myResult && (
              <p>
                <strong>+{myResult.gained}</strong> نقطة · المجموع{" "}
                <strong>{myResult.total}</strong> · المرتبة <strong>{myResult.rank}</strong>
              </p>
            )}

            {reveal && reveal.top.length > 0 && (
              <>
                <h3>الأوائل</h3>
                <ol className="leaderboard">
                  {reveal.top.map((e, i) => (
                    <li key={i}>
                      <span>{e.rank}</span> <strong>{e.name}</strong>{" "}
                      <span className="hint">{e.points}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        ) : (
          <div className="card">
            <h1>أهلاً {joined.name} 👋</h1>
            <p>
              {hostConnected
                ? "بانتظار المعلم يبدأ الأسئلة..."
                : "بانتظار المعلم يفتح الجلسة..."}
            </p>
          </div>
        )}

        <h2>المتصلون ({players.length})</h2>
        <ul>
          {players.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>

        <button className="btn" onClick={handleLeave}>اخرج من الجلسة</button>
      </div>
    );
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h1>انضم لجلسة</h1>

      <div>
        <label htmlFor="code">كود الجلسة</label>
        <input
          id="code"
          dir="ltr"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          maxLength={6}
          autoComplete="off"
          style={{ textTransform: "uppercase", letterSpacing: 4 }}
        />
      </div>

      <div>
        <label htmlFor="name">اسمك</label>
        <input
          id="name"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          maxLength={50}
          autoComplete="off"
        />
      </div>

      {error && <p className="error">{error}</p>}

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? "جاري الانضمام..." : "انضم"}
      </button>
    </form>
  );
}

export default JoinPage;