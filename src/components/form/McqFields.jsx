function McqFields({  options, setOptions, correctIndex, setCorrectIndex }) {
    function handleOptionChange(index, value) {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    }

    return (
        <>
            <p className="hint">اكتب الخيارات، وحدد الإجابة الصحيحة من الدائرة جنبها.</p>
            {options.map((opt, i) => (
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
            ))}
        </>
    );
}

export default McqFields;