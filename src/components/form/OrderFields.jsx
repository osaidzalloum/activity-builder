function OrderFields({ items, setItems }) {
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

    return (
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
                    <button type="button" className="btn btn-delete"
                        onClick={() => removeItem(i)} disabled={items.length <= 2}>✕</button>
                </div>
            ))}
            <button type="button" className="btn" onClick={addItem}>+ إضافة عنصر</button>
        </>
    );
}

export default OrderFields;