import QuestionItem from './QuestionItem';
import type { Question } from '../types';


type QuestionListProps = {
  questions: Question[];
  onDeleteQuestion: (id: string) => void;
  onEditQuestion: (question: Question) => void;
};

function QuestionList({ questions, onDeleteQuestion, onEditQuestion }: QuestionListProps) {
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
