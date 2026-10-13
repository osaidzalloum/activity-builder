
import QuestionList from '../components/QuestionList';
import QuestionForm from '../components/QuestionForm';
import Modal from '../components/Modal';

import { useState, type Dispatch, type SetStateAction } from 'react';
import type { Question, QuestionDraft } from '../types';
type BuilderPageProps = {
    questions: Question[];
    setQuestions: Dispatch<SetStateAction<Question[]>>;
};
function BuilderPage({ questions, setQuestions }: BuilderPageProps) {

    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    function handleDeleteQuestion(id: string) {
        setQuestions((currentQuestions) =>
            currentQuestions.filter((question) => question.id !== id)
        );
        if (editingQuestion?.id === id) {
            setEditingQuestion(null);
        }
    }

    function handleAddQuestion(draft: QuestionDraft) {
        setQuestions((current) => [...current, { ...draft, id: crypto.randomUUID() }]);
        closeForm();
    }

    function handleUpdateQuestion(updated: Question) {
        setQuestions((current) =>
            current.map((q) => (q.id === updated.id ? updated : q))
        );
        closeForm();
    }

    function openAddForm() {
        setEditingQuestion(null);
        setIsFormOpen(true);
    }

    function openEditForm(question: Question) {
        setEditingQuestion(question);
        setIsFormOpen(true);
    }

    function closeForm() {
        setIsFormOpen(false);
        setEditingQuestion(null);
    }
    return (
        <div>
            <h2>الأسئلة</h2>
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
