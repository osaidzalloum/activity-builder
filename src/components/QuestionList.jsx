import QuestionItem from './QuestionItem';

function QuestionList({ questions, onDeleteQuestion, onEditQuestion }) {
    if (questions.length === 0) {
    return <p>لا توجد أسئلة بعد</p>;
  }
  return (
    <div>
      {questions.map((question) => (
        <QuestionItem key={question.id} question={question} onDeleteQuestion={onDeleteQuestion} onEditQuestion={onEditQuestion} />
      ))}
    </div>
  );
}

export default QuestionList;
