import type { Question, QuestionType, McqQuestion, OrderQuestion, MatchQuestion } from '../types';
type QuestionItemProps = {
  question: Question;
  onDeleteQuestion: (id: string) => void;
  onEditQuestion: (question: Question) => void;
};
// أسماء الأنواع للشارة
const typeLabels: Record<QuestionType, string> = {
  mcq: "اختيار من متعدد",
  order: "ترتيب",
  match: "مطابقة",
};
// معاينة لكل نوع
function McqPreview({ question }: { question: McqQuestion }) {
  return (
    <ul className="options">
      {question.options.map((opt, i) => (
        <li key={i} className={i === question.correctIndex ? "correct-answer" : ""}>
          {opt}
        </li>
      ))}
    </ul>
  );
}

function OrderPreview({ question }: { question: OrderQuestion }) {
  return (
    <ol className="options">
      {question.items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

function MatchPreview({ question }: { question: MatchQuestion }) {
  return (
    <ul className="options">
      {question.pairs.map((pair, i) => (
        <li key={i}>{pair.left} ← {pair.right}</li>
      ))}
    </ul>
  );
}


function renderPreview(question: Question) {
  switch (question.type) {
    case "mcq":
      return <McqPreview question={question} />;
    case "order":
      return <OrderPreview question={question} />;
    case "match":
      return <MatchPreview question={question} />;
  }
}
function QuestionItem({ question, onDeleteQuestion, onEditQuestion }: QuestionItemProps) {

  return (
    <div className="card">
      <span className="badge">
        {typeLabels[question.type]}
      </span>
      <h3>{question.text}</h3>
      {renderPreview(question)}
      <div className="actions">
        <button className="btn btn-delete" onClick={() => onDeleteQuestion(question.id)}>
          حذف
        </button>
        <button className="btn btn-edit" onClick={() => onEditQuestion(question)}>
          تعديل
        </button>
      </div>
    </div>
  );
}

export default QuestionItem;