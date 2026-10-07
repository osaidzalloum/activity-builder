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
      <div>
        <h2>انتهى النشاط!</h2>
        <p>نتيجتك: {score} من {questions.length}</p>
        <button onClick={() => {
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

  return (
    <div>
      <h2>السؤال {currentIndex + 1} من {questions.length}</h2>
      <p>{question.text}</p>
      <ul>
        {question.options.map((option, index) => (
          <li key={index}>
            <button onClick={() => setSelected(index)} disabled={selected !== null}>
              {option}
            </button>
          </li>
        ))}
      </ul>
      {selected !== null && (
        <div>
          <p>{isCorrect ? '✅ إجابة صحيحة' : '❌ إجابة خاطئة'}</p>
          <button
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