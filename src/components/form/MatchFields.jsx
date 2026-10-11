function MatchFields({ pairs, setPairs }) {
    function handlePairChange(index, side, value) {
        setPairs(pairs.map((p, i) => (i === index ? { ...p, [side]: value } : p)));
    }

    function addPair() {
        setPairs([...pairs, { left: "", right: "" }]);
    }

    function removePair(index) {
        setPairs(pairs.filter((_, i) => i !== index));
    }
    return (
        <>
            <p className="hint">اكتب كل زوج متطابق بنفس السطر، واللعبة بتخلط العمود الثاني.</p>
            {pairs.map((pair, i) => (
                <div key={i} className="option-row">
                    <input
                        value={pair.left}
                        onChange={(e) => handlePairChange(i, "left", e.target.value)}
                        placeholder={`العنصر ${i + 1}`}
                    />
                    <span>←</span>
                    <input
                        value={pair.right}
                        onChange={(e) => handlePairChange(i, "right", e.target.value)}
                        placeholder="ما يطابقه"
                    />
                    <button type="button" className="btn btn-delete"
                        onClick={() => removePair(i)} disabled={pairs.length <= 2}>✕</button>
                </div>
            ))}
            <button type="button" className="btn" onClick={addPair}>+ إضافة زوج</button>
        </>
    );
}

export default MatchFields;