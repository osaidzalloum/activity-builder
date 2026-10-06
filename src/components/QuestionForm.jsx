import { useState } from 'react';
function QuestionForm({ editingQuestion, onAddQuestion, onUpdateQuestion, onCancel }) {
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

    }

    return (

        <form className="card form" onSubmit={handleSubmit}>
            <h3>{editingQuestion ? "تعديل سؤال" : "إضافة سؤال"}</h3>
            <input
                className="form-control"
                placeholder="نص السؤال"
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            {options.map((opt, i) => (
                <div key={i} className="option-row">
                    <input className="form-check-input"
                        type="radio"
                        name="correctOption"
                        checked={correctIndex === i}
                        onChange={() => setCorrectIndex(i)}
                        aria-label={`تحديد الخيار ${i + 1} كإجابة صحيحة`}
                    />
                    <input
                        className="form-control"
                        value={opt}
                        onChange={(e) => handleOptionChange(i, e.target.value)}
                        placeholder={`الخيار ${i + 1}`}
                    />
                </div>
            ))}
            {error && <p className="error">{error}</p>}
            <div className="actions">
    <button className="btn btn-primary" type="submit">حفظ</button>
    <button className="btn" type="button" onClick={onCancel}>إلغاء</button>
</div>          
            
        </form>

    );
}

export default QuestionForm;