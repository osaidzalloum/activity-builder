import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { liveSessionSchema } from "../schemas";
import { summarizeSession } from "../utils/summarizeSession";
import type { LiveSession } from "../types";

type LoadStatus = "loading" | "ready" | "not-found" | "error";

function SessionReviewPage() {
  const { code } = useParams<{ code: string }>();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    let ignore = false;

    async function load() {
      // RLS lets only the host read a session: anyone else gets no row
      const { data, error } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("code", (code ?? "").toUpperCase())
        .maybeSingle();

      if (ignore) return;
      if (error) {
        console.error(error);
        setStatus("error");
        return;
      }
      if (!data) {
        setStatus("not-found");
        return;
      }

      const parsed = liveSessionSchema.safeParse(data);
      if (!parsed.success) {
        console.error(parsed.error.issues);
        setStatus("error");
        return;
      }

      setSession(parsed.data);
      setStatus("ready");
    }

    load();
    return () => { ignore = true; };
  }, [code]);

  // derived: recomputed only when the saved record changes
  const summary = useMemo(() => (session ? summarizeSession(session.results) : null), [session]);

  if (status === "loading") return <p>جاري التحميل...</p>;
  if (status === "not-found") return <p>الجلسة غير موجودة.</p>;
  if (status === "error" || !session || !summary) return <p>صار خطأ أثناء تحميل النتائج.</p>;

  const { players, questions } = summary;

  return (
    <div>
      <Link to="/" className="back-link">→ أنشطتي</Link>

      <h1>نتائج الجلسة {session.code}</h1>
      <p className="hint">
        {new Date(session.created_at).toLocaleString("ar")}
        {" · "}
        {session.scoring_mode === "fixed" ? "نقاط ثابتة" : "نقاط مع مكافأة سرعة"}
        {" · "}
        {session.ended_at ? "انتهت" : "لم تنتهِ بعد"}
      </p>

      {questions.length === 0 ? (
        <p>ما انكشف أي سؤال بهالجلسة، فما في نتائج للعرض.</p>
      ) : (
        <>
          <h2>الطلاب ({players.length})</h2>
          <div className="card">
            <table className="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الاسم</th>
                  <th>النقاط</th>
                  <th>الإجابات الصحيحة</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td>{p.rank}</td>
                    <td>{p.name}</td>
                    <td>{p.points}</td>
                    <td>
                      {p.correct} / {questions.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>الأسئلة</h2>
          {questions.map((q, i) => (
            <div key={q.id} className="card">
              <p className="hint">السؤال {i + 1}</p>
              <h3>{q.text}</h3>
              <ul className="options">
                {q.options.map((option, j) => (
                  <li key={j} className={j === q.correctIndex ? "correct-answer" : ""}>
                    {option} <span className="hint">({q.optionCounts[j]})</span>
                  </li>
                ))}
              </ul>

              {q.percent === null ? (
                <p className="hint">ما حدا جاوب هذا السؤال.</p>
              ) : (
                <>
                  <div className="progress">
                    <div className="progress-fill" style={{ width: `${q.percent}%` }} />
                  </div>
                  <p className="hint">
                    {q.percent}% جاوبوا صح ({q.correctCount} من {q.answeredCount})
                  </p>
                </>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default SessionReviewPage;