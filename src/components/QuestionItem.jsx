// أسماء الأنواع للشارة
const typeLabels = {
  mcq: "اختيار من متعدد",
  order: "ترتيب",
  match: "مطابقة",
};
// معاينة لكل نوع
function McqPreview({ question }) {
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

function OrderPreview({ question }) {
  return (
    <ol className="options">
      {question.items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

function MatchPreview({ question }) {
  return (
    <ul className="options">
      {question.pairs.map((pair, i) => (
        <li key={i}>{pair.left} ← {pair.right}</li>
      ))}
    </ul>
  );
}

const previews = {
  mcq: McqPreview,
  order: OrderPreview,
  match: MatchPreview,
};

function QuestionItem({ question, onDeleteQuestion, onEditQuestion }) {

  const PreviewComponent = previews[question.type];

  return (
    <div className="card">
      <span className="badge">
        {typeLabels[question.type] ?? question.type}
      </span>
      <h3>{question.text}</h3>
      {PreviewComponent ? <PreviewComponent question={question} /> : <p>نوع غير مدعوم</p>}
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