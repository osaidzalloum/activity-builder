
import QuestionList from '../components/QuestionList';
import QuestionForm from '../components/QuestionForm';
import Modal from '../components/Modal';
import { fetchTriviaQuestions } from '../lib/trivia';
import { useState, type Dispatch, type SetStateAction } from 'react';
import type { Question, QuestionDraft } from '../types';
type BuilderPageProps = {
    questions: Question[];
    setQuestions: Dispatch<SetStateAction<Question[]>>;
};
function BuilderPage({ questions, setQuestions }: BuilderPageProps) {

    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState("");
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
    async function handleImport() {
        setImporting(true);
        setImportError("");
        try {
            const drafts = await fetchTriviaQuestions(5);
            setQuestions((current) => [
                ...current,
                ...drafts.map((draft) => ({ ...draft, id: crypto.randomUUID() })),
            ]);
        } catch (err) {
            console.error(err);
            setImportError("ما قدرنا نجيب الأسئلة. تأكد من الإنترنت وحاول مرة ثانية.");
        } finally {
            setImporting(false);
        }
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
            <div className="actions">
                <button className="btn btn-primary" onClick={openAddForm}>
                    + إضافة سؤال
                </button>
                <button className="btn" onClick={handleImport} disabled={importing}>
                    {importing ? "جاري الاستيراد..." : "استيراد 5 أسئلة"}
                </button>
            </div>
            {importError && <p className="error">{importError}</p>}
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
