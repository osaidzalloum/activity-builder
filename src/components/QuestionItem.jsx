function QuestionItem({ question, onDeleteQuestion, onEditQuestion }) {

  return (
    <div className="card">
       <h3>{question.text}</h3>
          <ul className="options">
            {question.options.map((opt, i) => (
              <li key={i} className={i === question.correctIndex ? "correct-answer" : ""}>
                {opt}
              </li>
            ))}
          </ul>
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