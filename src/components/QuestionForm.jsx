import { useState } from 'react';
function QuestionForm({ editingQuestion, onAddQuestion, onUpdateQuestion, onCancel }) {
    const [text, setText] = useState(editingQuestion?.text ?? "");
    const [options, setOptions] = useState(editingQuestion?.options ?? ["", "", "", ""]);
    const [correctIndex, setCorrectIndex] = useState(editingQuestion?.correctIndex ?? 0);
    const [error, setError] = useState("");

    const [type, setType] = useState(editingQuestion?.type ?? "mcq");
    const [items, setItems] = useState(editingQuestion?.items ?? ["", "", ""]);

    function handleOptionChange(index, value) {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    }
    function handleItemChange(index, value) {
        const newItems = [...items];
        newItems[index] = value;
        setItems(newItems);
    }

    function addItem() {
        setItems([...items, ""]);
    }

    function removeItem(index) {
        setItems(items.filter((_, i) => i !== index));
    }

     function handleSubmit(e) {
        e.preventDefault();

        const fields = type === "order" ? items : options;
        if (text.trim() === "" || fields.some((f) => f.trim() === "")) {
            setError("يرجى ملء جميع الحقول.");
            return;
        }
        setError("");

        const data = type === "order"
            ? { type, text, items }
            : { type, text, options, correctIndex };

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
                </select>
            )}

            <input
                placeholder="نص السؤال"
                value={text}
                onChange={(e) => setText(e.target.value)}
            />

            {type === "mcq" ? (
                options.map((opt, i) => (
                    <div key={i} className="option-row">
                        <input
                            type="radio"
                            name="correctOption"
                            checked={correctIndex === i}
                            onChange={() => setCorrectIndex(i)}
                            aria-label={`تحديد الخيار ${i + 1} كإجابة صحيحة`}
                        />
                        <input
                            value={opt}
                            onChange={(e) => handleOptionChange(i, e.target.value)}
                            placeholder={`الخيار ${i + 1}`}
                        />
                    </div>
                ))
            ) : (
                <>
                    <p className="hint">اكتب العناصر بالترتيب الصحيح، واللعبة بتخلطها للطالب.</p>
                    {items.map((item, i) => (
                        <div key={i} className="option-row">
                            <span>{i + 1}.</span>
                            <input
                                value={item}
                                onChange={(e) => handleItemChange(i, e.target.value)}
                                placeholder={`العنصر ${i + 1}`}
                            />
                            <button
                                type="button"
                                className="btn btn-delete"
                                onClick={() => removeItem(i)}
                                disabled={items.length <= 2}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    <button type="button" className="btn" onClick={addItem}>
                        + إضافة عنصر
                    </button>
                </>
            )}

            {error && <p className="error">{error}</p>}

            <div className="actions">
                <button className="btn btn-primary" type="submit">حفظ</button>
                <button className="btn" type="button" onClick={onCancel}>إلغاء</button>
            </div>
        </form>
    );
}

export default QuestionForm;