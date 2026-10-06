import { useState } from 'react';

function QuestionForm({ editingQuestion, onAddQuestion, onUpdateQuestion, onCancelEdit }) {
    const [text, setText] = useState(editingQuestion?.text ?? "");
    const [options, setOptions] = useState(editingQuestion?.options ?? ["", "", "", ""]);
    const [correctIndex, setCorrectIndex] = useState(editingQuestion?.correctIndex ?? 0);
    const [error, setError] = useState("");

    function handleOptionChange(index, value) {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    }

    function handleSubmit(e) {
        e.preventDefault();

        if (text.trim() === "" || options.some((opt) => opt.trim() === "")) {
            setError("يرجى ملء جميع الحقول.");
            return;
        }
        setError("");
        if (editingQuestion) {
            onUpdateQuestion({ ...editingQuestion, text, options, correctIndex });
            return;
        }
        onAddQuestion({ text, options, correctIndex });
        setText("");
        setOptions(["", "", "", ""]);
        setCorrectIndex(0);
    }

    return (

        <form onSubmit={handleSubmit}>
            <h3>{editingQuestion ? "تعديل سؤال" : "إضافة سؤال"}</h3>
            <input
                placeholder="نص السؤال"
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            {options.map((opt, i) => (
                <div key={i}>
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
            ))}
            {error && <p className="error">{error}</p>}
            <button type="submit">
                {editingQuestion ? "حفظ التعديل" : "إضافة سؤال"}
            </button>
            {editingQuestion && (
                <button type="button" onClick={onCancelEdit}>إلغاء</button>
            )}
        </form>

    );
}

export default QuestionForm;