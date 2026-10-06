function QuestionItem({ question, onDeleteQuestion, onEditQuestion }) {

  return (
    <div>
       <h3>{question.text}</h3>
          <ul>
            {question.options.map((opt, i) => (
              <li key={i} className={i === question.correctIndex ? "correct-answer" : ""}>
                {opt}
              </li>
            ))}
          </ul>
          <button onClick={() => onDeleteQuestion(question.id)}> حذف </button>
          <button onClick={() => onEditQuestion(question)}>تعديل</button>
        </div>
  );
}

export default QuestionItem;