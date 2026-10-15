import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import { questionsSchema, attemptsSchema } from '../schemas';
import type { Question, Attempt } from '../types';

type LoadStatus = "loading" | "ready" | "not-found" | "forbidden" | "error";

function ResultsPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    if (!activityId || !user) return;
    const userId = user.id;
    let ignore = false;

    async function load() {
      const [activityRes, attemptsRes] = await Promise.all([
        supabase.from('activities').select('title, questions, owner_id').eq('id', activityId).maybeSingle(),
        supabase.from('attempts').select('*').eq('activity_id', activityId).order('created_at', { ascending: false }),
      ]);

      if (ignore) return;
      if (activityRes.error || attemptsRes.error) {
        console.error(activityRes.error ?? attemptsRes.error);
        setStatus("error");
        return;
      }
      if (!activityRes.data) return setStatus("not-found");
      if (activityRes.data.owner_id !== userId) return setStatus("forbidden");

      const parsedQuestions = questionsSchema.safeParse(activityRes.data.questions);
      const parsedAttempts = attemptsSchema.safeParse(attemptsRes.data);
      if (!parsedQuestions.success || !parsedAttempts.success) {
        console.error(parsedQuestions.error ?? parsedAttempts.error);
        setStatus("error");
        return;
      }

      setTitle(activityRes.data.title);
      setQuestions(parsedQuestions.data);
      setAttempts(parsedAttempts.data);
      setStatus("ready");
    }

    load();
    return () => { ignore = true; };
  }, [activityId, user]);

  if (status === "loading") return <p>جاري التحميل...</p>;
  if (status === "not-found") return <p>النشاط غير موجود.</p>;
  if (status === "forbidden") return <p>ليس لديك صلاحية لعرض هذه النتائج.</p>;
  if (status === "error") return <p>صار خطأ أثناء تحميل النتائج.</p>;

  // ===== الإحصائيات (قيم مشتقة) =====
  const averagePercent = attempts.length === 0
    ? 0
    : Math.round(
      (attempts.reduce((sum, a) => sum + a.score / a.total, 0) / attempts.length) * 100
    );

  const questionStats = questions.map((q) => {
    const answersForQuestion = attempts
      .map((a) => a.answers.find((ans) => ans.questionId === q.id))
      .filter((ans) => ans !== undefined);
    const correct = answersForQuestion.filter((ans) => ans.correct).length;   
    const percent = answersForQuestion.length === 0
      ? 0
      : Math.round((correct / answersForQuestion.length) * 100);

    return { question: q, percent, count: answersForQuestion.length };
  });

  return (
    <div>
      <Link to="/" className="back-link">→ أنشطتي</Link>
      <h1>نتائج: {title}</h1>

      {attempts.length === 0 ? (
        <p>ما حدا حل النشاط لسا. انسخ الرابط وابعته لطلابك!</p>
      ) : (
        <>
          <div className="card">
            <p>عدد المحاولات: <strong>{attempts.length}</strong></p>
            <p>المعدل: <strong>{averagePercent}%</strong></p>
          </div>

          <h2>الأسئلة</h2>
          {questionStats.map(({ question, percent, count }) => (
            <div key={question.id} className="card">
              <p>{question.text}</p>
              <div className="progress">
                <div className="progress-fill" style={{ width: `${percent}%` }} />
              </div>
              <p className="hint">{percent}% جاوبوا صح (من {count} طالب)</p>
            </div>
          ))}

          <h2>الطلاب</h2>
          <div className="card">
            <table className="results-table">
              <thead>
                <tr><th>الاسم</th><th>العلامة</th><th>التاريخ</th></tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.student_name}</td>
                    <td>{a.score} / {a.total}</td>
                    <td>{new Date(a.created_at).toLocaleString("ar")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default ResultsPage;