import QuestionList from '../components/QuestionList';
import QuestionForm from '../components/QuestionForm';
import Modal from '../components/Modal';

import { useState } from 'react';
function BuilderPage({ questions, setQuestions }) {

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
        <div>
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
export default BuilderPage;
