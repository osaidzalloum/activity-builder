function QuestionItem({ question, onDeleteQuestion, onEditQuestion }) {

  return (
    <div className="card">
      <span className="badge">
        {question.type === "order" ? "ترتيب" : "اختيار من متعدد"}
      </span>
      <h3>{question.text}</h3>
      {question.type === "order" ? (
        <ol className="options">
          {question.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className="options">
          {question.options.map((opt, i) => (
            <li key={i} className={i === question.correctIndex ? "correct-answer" : ""}>
              {opt}
            </li>
          ))}
        </ul>
      )}

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