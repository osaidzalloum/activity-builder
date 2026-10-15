import { useState, type FormEvent } from 'react';
import type { Question, QuestionDraft, QuestionType, MatchPair } from '../types';
import { validateQuestion } from '../utils/validateQuestion';
import OrderFields from './form/OrderFields';
import McqFields from './form/McqFields';
import MatchFields from './form/MatchFields';

type QuestionFormProps = {
    editingQuestion: Question | null;
    onAddQuestion: (draft: QuestionDraft) => void;
    onUpdateQuestion: (question: Question) => void;
    onCancel: () => void;
};
const emptyPairs: MatchPair[] = [{ left: "", right: "" }, { left: "", right: "" }];

function QuestionForm({ editingQuestion, onAddQuestion, onUpdateQuestion, onCancel }: QuestionFormProps) {
    const [type, setType] = useState<QuestionType>(editingQuestion?.type ?? "mcq");
    const [text, setText] = useState(editingQuestion?.text ?? "");
    const [options, setOptions] = useState<string[]>(
        editingQuestion?.type === "mcq" ? editingQuestion.options : ["", "", "", ""]
    );
    const [correctIndex, setCorrectIndex] = useState(
        editingQuestion?.type === "mcq" ? editingQuestion.correctIndex : 0
    );
    const [items, setItems] = useState<string[]>(
        editingQuestion?.type === "order" ? editingQuestion.items : ["", "", ""]
    );
    const [pairs, setPairs] = useState<MatchPair[]>(
        editingQuestion?.type === "match" ? editingQuestion.pairs : emptyPairs
    );
    const [error, setError] = useState("");

    // ===== بناء كائن السؤال حسب النوع =====
    function buildData(): QuestionDraft {
        if (type === "order") return { type, text, items };
        if (type === "match") return { type, text, pairs };
        return { type, text, options, correctIndex };
    }

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const data = buildData();
        const errorMessage = validateQuestion(data);
        if (errorMessage) {
            setError(errorMessage);
            return;
        }
        setError("");

        if (editingQuestion) {
            onUpdateQuestion({ ...data, id: editingQuestion.id });
        } else {
            onAddQuestion(data);
        }
    }

    return (
        <form className="card form" onSubmit={handleSubmit}>
            <h3>{editingQuestion ? "تعديل سؤال" : "إضافة سؤال"}</h3>

            {!editingQuestion && (
                <select value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
                    <option value="mcq">اختيار من متعدد</option>
                    <option value="order">ترتيب</option>
                    <option value="match">مطابقة</option>
                </select>
            )}

            <input
                placeholder="نص السؤال"
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            {type === "mcq" && (
                <McqFields options={options} setOptions={setOptions} correctIndex={correctIndex} setCorrectIndex={setCorrectIndex} />
            )}
            {type === "order" && <OrderFields items={items} setItems={setItems} />}
            {type === "match" && <MatchFields pairs={pairs} setPairs={setPairs} />}

            {error && <p className="error">{error}</p>}

            <div className="actions">
                <button className="btn btn-primary" type="submit">حفظ</button>
                <button className="btn" type="button" onClick={onCancel}>إلغاء</button>
            </div>
        </form>
    );
}

export default QuestionForm;