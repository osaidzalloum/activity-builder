import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import { liveSessionSchema, questionsSchema } from "../schemas";
import { toPublicQuestion } from "../utils/toPublicQuestion";
import useLiveChannel from "../hooks/useLiveChannel";
import type { LiveSession, Question, QuestionEvent, SessionState } from "../types";

type LoadStatus = "loading" | "ready" | "not-found" | "error";

const LiveHostPage = () => {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
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

  const { participants, send } = useLiveChannel(
    status === "ready" ? code : undefined,
    user?.id,
    "Host",
    "host"
  );
  const players = participants.filter((p) => p.role === "player");

  // only the questions that live sessions support, without the answers
  const publicQuestions = useMemo(
    () =>
      questions.flatMap((q) => {
        const publicQuestion = toPublicQuestion(q);
        return publicQuestion ? [publicQuestion] : [];
      }),
    [questions]
  );

  if (status === "loading") return <p>جاري التحميل...</p>;
  if (status === "not-found") return <p>الجلسة غير موجودة.</p>;
  if (status === "error" || !session) return <p>صار خطأ أثناء تحميل الجلسة.</p>;

  const skipped = questions.length - publicQuestions.length;
  const currentIndex =
    session.state.status === "question" || session.state.status === "reveal"
      ? session.state.index
      : -1;
  const current = publicQuestions[currentIndex] ?? null;
  const nextIndex = currentIndex + 1;
  const hasMore = nextIndex < publicQuestions.length;

  async function handleNext() {
    if (!session || !hasMore) return;
    setBusy(true);
    setActionError("");

    const startedAt = Date.now();
    const newState: SessionState = { status: "question", index: nextIndex, startedAt };

    // 1. save the state, so a student who refreshes can recover it
    const { data, error } = await supabase
      .from("live_sessions")
      .update({ state: newState })
      .eq("id", session.id)
      .select("id");

    // an update blocked by RLS returns no error, only zero rows
    if (error || !data || data.length === 0) {
      console.error(error);
      setActionError("ما قدرنا نحدّث الجلسة.");
      setBusy(false);
      return;
    }
    setSession({ ...session, state: newState });

    // 2. then notify the students
    const event: QuestionEvent = {
      index: nextIndex,
      total: publicQuestions.length,
      startedAt,
      question: publicQuestions[nextIndex],
    };
    const sent = await send("question", event);
    if (!sent) setActionError("انحفظ التحديث بس البث للطلاب فشل.");
    setBusy(false);
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

      {publicQuestions.length === 0 ? (
        <p className="error">هذا النشاط ما فيه أسئلة اختيار من متعدد.</p>
      ) : (
        <div className="card">
          {current ? (
            <>
              <p className="hint">
                السؤال {currentIndex + 1} من {publicQuestions.length}
              </p>
              <h2>{current.text}</h2>
              <ul className="options">
                {current.options.map((option, i) => (
                  <li key={i}>{option}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>لسا ما بدأت الأسئلة.</p>
          )}

          {hasMore ? (
            <button className="btn btn-primary" onClick={handleNext} disabled={busy}>
              {busy ? "جاري الإرسال..." : currentIndex < 0 ? "ابدأ: السؤال الأول" : "السؤال التالي"}
            </button>
          ) : (
            <p className="hint">انتهت الأسئلة.</p>
          )}
          {actionError && <p className="error">{actionError}</p>}
        </div>
      )}

      <h2>المتصلون ({players.length})</h2>
      {players.length === 0 ? (
        <p>لسا ما حدا انضم.</p>
      ) : (
        <ul>
          {players.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LiveHostPage;