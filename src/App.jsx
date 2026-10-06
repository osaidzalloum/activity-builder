
import './App.css'
import { useState,useEffect } from 'react';

import QuestionList from './components/QuestionList';
import QuestionForm from './components/QuestionForm';
import Modal from './components/Modal';
const initialQuestions = [
  { id: "q1", text: "ما ناتج 5 + 3؟", options: ["6", "8", "9", "7"], correctIndex: 1 },
  { id: "q2", text: "ما عاصمة الأردن؟", options: ["إربد", "الزرقاء", "عمّان", "العقبة"], correctIndex: 2 },
  { id: "q3", text: "كم عدد أيام الأسبوع؟", options: ["5", "6", "7", "8"], correctIndex: 2 },
];



function App() {
 const [questions, setQuestions] = useState(() => {
  try {
    const saved = localStorage.getItem("questions");
    return saved ? JSON.parse(saved) : initialQuestions;
  } catch  {
    return initialQuestions;
  }
 });

  useEffect(() => {
    localStorage.setItem("questions", JSON.stringify(questions));
    
  }, [questions]);
 const [editingQuestion, setEditingQuestion] = useState(null);
 const [isFormOpen, setIsFormOpen] = useState(false);
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
  closeForm();
}

function handleUpdateQuestion(updated) {
  setQuestions((current) =>
    current.map((q) => (q.id === updated.id ? updated : q))
  );
  closeForm();
}

function openAddForm() {
  setEditingQuestion(null);
  setIsFormOpen(true);
}

function openEditForm(question) {
  setEditingQuestion(question);
  setIsFormOpen(true);
}

function closeForm() {
  setIsFormOpen(false);
  setEditingQuestion(null);
}
  return (
    <div dir="rtl" className="container">
      <h1>منشئ الأنشطة</h1>
      <QuestionList
        questions={questions}
        onDeleteQuestion={handleDeleteQuestion}
        onEditQuestion={openEditForm}
      />
      <button className="btn btn-primary" onClick={openAddForm}>
        + إضافة سؤال
      </button>

      {isFormOpen && (
        <Modal onClose={closeForm}>
          <QuestionForm
            key={editingQuestion?.id ?? "new"}
            editingQuestion={editingQuestion}
            onAddQuestion={handleAddQuestion}
            onUpdateQuestion={handleUpdateQuestion}
            onCancel={closeForm}
          />
        </Modal>
      )}
    </div>
  );
}

export default App;
