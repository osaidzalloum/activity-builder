
import './App.css'
import { useState } from 'react';

import QuestionList from './components/QuestionList';
import QuestionForm from './components/QuestionForm';

const initialQuestions = [
  { id: "q1", text: "ما ناتج 5 + 3؟", options: ["6", "8", "9", "7"], correctIndex: 1 },
  { id: "q2", text: "ما عاصمة الأردن؟", options: ["إربد", "الزرقاء", "عمّان", "العقبة"], correctIndex: 2 },
  { id: "q3", text: "كم عدد أيام الأسبوع؟", options: ["5", "6", "7", "8"], correctIndex: 2 },
];



function App() {
 const [questions, setQuestions] = useState(initialQuestions);
 const [editingQuestion, setEditingQuestion] = useState(null);
 function handleDeleteQuestion(id) {
    setQuestions((currentQuestions) =>
      currentQuestions.filter((question) => question.id !== id)
    );
    if (editingQuestion?.id === id) {
    setEditingQuestion(null);
  }
  }

  function handleAddQuestion(question) {
  setQuestions((current) => [...current, { ...question, id: crypto.randomUUID() }]);
}

function handleUpdateQuestion(updated) {
  setQuestions((current) =>
    current.map((q) => (q.id === updated.id ? updated : q))
  );
  setEditingQuestion(null);
}
  return (
    <div dir="rtl">
      <h1>منشئ الأنشطة</h1>
      <QuestionList
        questions={questions}
        onDeleteQuestion={handleDeleteQuestion}
        onEditQuestion={setEditingQuestion}
      />
      <QuestionForm
        key={editingQuestion?.id ?? "new"}
        editingQuestion={editingQuestion}
        onAddQuestion={handleAddQuestion}
        onUpdateQuestion={handleUpdateQuestion}
        onCancelEdit={() => setEditingQuestion(null)}
      />
    </div>
  );
}

export default App;
