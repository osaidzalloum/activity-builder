import { useState } from 'react';
import OrderFields from './form/OrderFields';
import McqFields from './form/McqFields';
import MatchFields from './form/MatchFields';
// فحص التكرار بمصفوفة نصوص (برا الـ component لأنها ما بتعتمد على state)
function hasDuplicates(values) {
    const trimmed = values.map((v) => v.trim());
    return new Set(trimmed).size !== trimmed.length;
}

function QuestionForm({ editingQuestion, onAddQuestion, onUpdateQuestion, onCancel }) {
    const [type, setType] = useState(editingQuestion?.type ?? "mcq");
    const [text, setText] = useState(editingQuestion?.text ?? "");
    const [options, setOptions] = useState(editingQuestion?.options ?? ["", "", "", ""]);
    const [correctIndex, setCorrectIndex] = useState(editingQuestion?.correctIndex ?? 0);
    const [items, setItems] = useState(editingQuestion?.items ?? ["", "", ""]);
    const [pairs, setPairs] = useState(
        editingQuestion?.pairs ?? [{ left: "", right: "" }, { left: "", right: "" }]
    );
    const [error, setError] = useState("");



    // ===== التحقق: بترجع رسالة الخطأ، أو null إذا كل اشي تمام =====
    function validate() {
        if (text.trim() === "") return "يرجى كتابة نص السؤال.";

        if (type === "mcq") {
            if (options.some((o) => o.trim() === "")) return "يرجى ملء جميع الخيارات.";
            if (hasDuplicates(options)) return "لا يمكن تكرار نفس الخيار.";
        }

        if (type === "order") {
            if (items.some((i) => i.trim() === "")) return "يرجى ملء جميع العناصر.";
            if (hasDuplicates(items)) return "لا يمكن تكرار نفس العنصر.";
        }

        if (type === "match") {
            const lefts = pairs.map((p) => p.left);
            const rights = pairs.map((p) => p.right);
            if ([...lefts, ...rights].some((v) => v.trim() === "")) return "يرجى ملء جميع الأزواج.";
            if (hasDuplicates(lefts)) return "لا يمكن تكرار عنصر في العمود الأول.";
            if (hasDuplicates(rights)) return "لا يمكن تكرار عنصر في العمود الثاني.";
        }

        return null;
    }

    // ===== بناء كائن السؤال حسب النوع =====
    function buildData() {
        if (type === "order") return { type, text, items };
        if (type === "match") return { type, text, pairs };
        return { type, text, options, correctIndex };
    }

    function handleSubmit(e) {
        e.preventDefault();

        const errorMessage = validate();
        if (errorMessage) {
            setError(errorMessage);
            return;
        }
        setError("");

        const data = buildData();
        if (editingQuestion) {
            onUpdateQuestion({ ...editingQuestion, ...data });
        } else {
            onAddQuestion(data);
        }
    }

    return (
        <form className="card form" onSubmit={handleSubmit}>
            <h3>{editingQuestion ? "تعديل سؤال" : "إضافة سؤال"}</h3>

            {!editingQuestion && (
                <select value={type} onChange={(e) => setType(e.target.value)}>
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