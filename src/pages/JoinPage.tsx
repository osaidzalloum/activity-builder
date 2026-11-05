import { FinalStandings, JoinForm, StudentQuestion } from "../components/live";
import useStudentGame from "../hooks/useStudentGame";

// Only the drawing: the logic lives in useStudentGame
function JoinPage() {
  const {
    restoring,
    joined,
    current,
    selected,
    reveal,
    myResult,
    answerError,
    final,
    myFinal,
    players,
    hostConnected,
    join,
    handleChoose,
    handleLeave,
  } = useStudentGame();

  if (restoring) return <p>جاري استعادة جلستك...</p>;

  if (!joined) return <JoinForm onJoin={join} />;

  if (final) return <FinalStandings mine={myFinal} top={final.top} onLeave={handleLeave} />;

  return (
    <div>
      {current ? (
        <StudentQuestion
          current={current}
          selected={selected}
          reveal={reveal}
          myResult={myResult}
          answerError={answerError}
          onChoose={handleChoose}
        />
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

export default JoinPage;