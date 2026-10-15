import { useState } from 'react';
import type { Question, AttemptResult } from '../types';
import McqQuestion from '../components/play/McqQuestion';
import OrderQuestion from '../components/play/OrderQuestion';
import MatchQuestion from '../components/play/MatchQuestion';

type PlayPageProps = {
  questions: Question[];
  onFinish?: (result: AttemptResult) => void;
};
function renderQuestion(question: Question, onAnswer: (isCorrect: boolean) => void) {
  switch (question.type) {
    case "mcq":
      return <McqQuestion key={question.id} question={question} onAnswer={onAnswer} />;
    case "order":
      return <OrderQuestion key={question.id} question={question} onAnswer={onAnswer} />;
    case "match":
      return <MatchQuestion key={question.id} question={question} onAnswer={onAnswer} />;
    default: {
      const unhandled: never = question;
      return unhandled;
    }
  }
}

function PlayPage({ questions ,onFinish  }: PlayPageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);

  const score = answers.filter(Boolean).length;
  if (questions.length === 0) {
    return <p>لا توجد أسئلة بعد. أضف أسئلة من صفحة البناء.</p>;
  }

  if (currentIndex >= questions.length) {
    return (
      <div className="card">
        <h2>انتهى النشاط!</h2>
        <p>نتيجتك: {score} من {questions.length}</p>
        <button className="btn btn-primary" onClick={() => {
          setCurrentIndex(0);
          setResult(null);
          setAnswers([]);
        }}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const question = questions[currentIndex];
  const answered = currentIndex + (result !== null ? 1 : 0);
  const progress = (answered / questions.length) * 100;

  function handleAnswer(isCorrect: boolean) {
    setResult(isCorrect);
    setAnswers((current) => [...current, isCorrect]);
  }

  function handleNext() {
    const nextIndex = currentIndex + 1;
    if (nextIndex === questions.length) {
      onFinish?.({ score, total: questions.length, answers });
    }
    setCurrentIndex(nextIndex);
    setResult(null);
  }
  const questionElement = renderQuestion(question, handleAnswer);
  if (!questionElement) {
    return <p>نوع سؤال غير مدعوم: {question.type}</p>;
  }
  return (
    <div className="card play-container">
      <div className="progress">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <h2>السؤال {currentIndex + 1} من {questions.length}</h2>

      {questionElement}

      {result !== null && (
        <div>
          <p>{result ? '✅ إجابة صحيحة' : '❌ إجابة خاطئة'}</p>
          <button className="btn btn-primary" onClick={handleNext}>
            {currentIndex < questions.length - 1 ? 'السؤال التالي' : 'إنهاء اللعبة'}
          </button>
        </div>
      )}
    </div>
  );
}

export default PlayPage;