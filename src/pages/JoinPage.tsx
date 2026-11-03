import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import {
  joinedSessionsSchema,
  participantSchema,
  questionEventSchema,
  revealEventSchema,
} from "../schemas";
import useLiveChannel from "../hooks/useLiveChannel";
import type { AnswerEvent, QuestionEvent, RevealEvent } from "../types";

type Joined = { code: string; name: string };

function JoinPage() {
  const [playerId] = useState(() => crypto.randomUUID());
  const [codeInput, setCodeInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [joined, setJoined] = useState<Joined | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [current, setCurrent] = useState<QuestionEvent | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<RevealEvent | null>(null);
  const [answerError, setAnswerError] = useState("");

  function handleBroadcast(event: string, payload: unknown) {
    // data from the channel is untrusted: validate before using it
    if (event === "question") {
      const parsed = questionEventSchema.safeParse(payload);
      if (!parsed.success) {
        console.error(parsed.error.issues);
        return;
      }
      setCurrent(parsed.data);
      setSelected(null);
      setRevealed(null);
      setAnswerError("");
    } else if (event === "reveal") {
      const parsed = revealEventSchema.safeParse(payload);
      if (!parsed.success) {
        console.error(parsed.error.issues);
        return;
      }
      setRevealed(parsed.data);
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
    const { data, error: rpcError } = await supabase.rpc("join_session", {
      p_code: code,
    });
    setSubmitting(false);

    if (rpcError) {
      console.error(rpcError);
      setError("صار خطأ، حاول مرة ثانية.");
      return;
    }

    // join_session returns an array (returns table)
    const parsed = joinedSessionsSchema.safeParse(data);
    if (!parsed.success) {
      console.error(parsed.error.issues);
      setError("صار خطأ، حاول مرة ثانية.");
      return;
    }
    if (parsed.data.length === 0) {
      setError("الكود غير صحيح، أو الجلسة انتهت.");
      return;
    }

    setJoined({ code, name: nameResult.data });
  }

  async function handleChoose(choice: number) {
    if (!current || selected !== null) return;
    setSelected(choice);
    setAnswerError("");

    const payload: AnswerEvent = { playerId, index: current.index, choice };
    const sent = await send("answer", payload);
    if (!sent) {
      // let the student try again
      setSelected(null);
      setAnswerError("ما وصل جوابك، حاول مرة ثانية.");
    }
  }

  if (joined) {
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
            {!reveal && selected !== null && <p className="hint">وصل جوابك، بانتظار المعلم...</p>}
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