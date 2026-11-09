import { Link, useParams } from "react-router-dom";
import { Leaderboard, PlayerList, ScoringPicker } from "../components/live";
import useHostGame from "../hooks/useHostGame";
import useLiveSession from "../hooks/useLiveSession";
import type { LiveSession, Question } from "../types";

// Only the drawing: the logic lives in useHostGame
function LiveHost({
  initialSession,
  questions,
}: {
  initialSession: LiveSession;
  questions: Question[];
}) {
  const {
    session,
    scoringMode,
    busy,
    actionError,
    connectionFailed,
    players,
    board,
    hasScores,
    answeredIds,
    isLobby,
    isOpen,
    isRevealed,
    isFinished,
    current,
    currentLive,
    currentIndex,
    totalQuestions,
    skipped,
    hasMore,
    answeredCount,
    countFor,
    handleScoringChange,
    handleNext,
    handleReveal,
    handleFinish,
  } = useHostGame(initialSession, questions);

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

      {connectionFailed && (
        <p className="error">تعذر الاتصال بقنوات الجلسة. تأكد من الإنترنت وحدّث الصفحة.</p>
      )}

      {skipped > 0 && (
        <p className="hint">
          {skipped} سؤال (ترتيب أو مطابقة) مش مدعوم بالجلسات الحية، فانتخطى.
        </p>
      )}

      {isFinished ? (
        <div className="card">
          <h2>انتهت الجلسة 🎉</h2>
          <p className="hint">الترتيب النهائي بالأسفل.</p>
          <div className="actions">
            <Link className="btn btn-primary" to={`/live/${session.code}/review`}>
              مراجعة النتائج
            </Link>
            <Link className="btn" to="/">العودة لأنشطتي</Link>
          </div>
        </div>
      ) : totalQuestions === 0 ? (
        <p className="error">هذا النشاط ما فيه أسئلة اختيار من متعدد.</p>
      ) : (
        <div className="card">
          {current && currentLive ? (
            <>
              <p className="hint">
                السؤال {currentIndex + 1} من {totalQuestions}
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

          {isLobby ? (
            <ScoringPicker mode={scoringMode} disabled={busy} onChange={handleScoringChange} />
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
          <Leaderboard entries={board} />
        </>
      )}

      <h2>المتصلون ({players.length})</h2>
      <PlayerList players={players} answeredIds={answeredIds} />
    </div>
  );
}

// Loads the session first, so everything below can rely on it being there
const LiveHostPage = () => {
  const { code } = useParams<{ code: string }>();
  const { session, questions, status } = useLiveSession(code);

  if (status === "loading") return <p>جاري التحميل...</p>;
  if (status === "not-found") return <p>الجلسة غير موجودة.</p>;
  if (status === "error" || !session) return <p>صار خطأ أثناء تحميل الجلسة.</p>;

  // key: a different session starts from a clean state
  return <LiveHost key={session.id} initialSession={session} questions={questions} />;
};

export default LiveHostPage;