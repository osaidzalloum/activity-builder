import { useState } from 'react';


function PlayPage({ questions }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  
  if (questions.length === 0) {
    return <p>لا توجد أسئلة بعد. أضف أسئلة من صفحة البناء.</p>;
  }
  if (currentIndex === questions.length) {
    return (
      <div className="card">
        <h2>انتهى النشاط!</h2>
        <p>نتيجتك: {score} من {questions.length}</p>
        <button className="btn btn-primary" onClick={() => {
          setCurrentIndex(0);
          setSelected(null);
          setScore(0);
        }}>
          إعادة المحاولة
        </button>
      </div>
    );
  }
  const question = questions[currentIndex];
  const isCorrect = selected === question.correctIndex;
  
function getOptionClass(index) {
  if (selected === null) return "play-option";
  if (index === question.correctIndex) return "play-option correct";
  if (index === selected) return "play-option wrong";
  return "play-option";
}
  return (
    <div className="card play-container">
      <h2>السؤال {currentIndex + 1} من {questions.length}</h2>
      <p>{question.text}</p>
      <ul className="options">
        {question.options.map((option, index) => (
          <li key={index}>
            <button className={getOptionClass(index)} onClick={() => setSelected(index)} disabled={selected !== null}>
              {option}
            </button>
          </li>
        ))}
      </ul>
      {selected !== null && (
        <div>
          <p>{isCorrect ? '✅ إجابة صحيحة' : '❌ إجابة خاطئة'}</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (isCorrect) {
                setScore((s) => s + 1);
              }
              setCurrentIndex(currentIndex + 1);
              setSelected(null);
            }}
          >
            {currentIndex < questions.length - 1 ? 'السؤال التالي' : 'إنهاء اللعبة'}
          </button>
        </div>
      )}

    </div>
  );


}

export default PlayPage;