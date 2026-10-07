import { useState } from 'react';
function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
function OrderQuestion({ question, onAnswer }) {
    const [currentOrder, setCurrentOrder] = useState(() => {
        let shuffled = shuffle(question.items);
        if (question.items.length > 1) {
            while (shuffled.every((item, i) => item === question.items[i])) {
                shuffled = shuffle(question.items);
            }
        }
        return shuffled;
    });
    const [checked, setChecked] = useState(false);
    function move(index, direction) {
        const target = index + direction;   // direction يا -1 (لفوق) يا +1 (لتحت)
        if (target < 0 || target >= currentOrder.length) return;
        const copy = [...currentOrder];
        [copy[index], copy[target]] = [copy[target], copy[index]];
        setCurrentOrder(copy);
    }
    function handleCheck() {
        setChecked(true);
        const isCorrect = currentOrder.every((item, i) => item === question.items[i]);
        onAnswer(isCorrect);
    }
    function getItemClass(item, index) {
        if (!checked) return "order-item";
        return item === question.items[index] ? "order-item correct" : "order-item wrong";
    }
    return (
        <>
            <p>{question.text}</p>
            <ul className="options">
                {currentOrder.map((item, index) => (
                    <li key={item} className={getItemClass(item, index)}>
                        <span>{item}</span>
                        <button className="btn" onClick={() => move(index, -1)} disabled={checked || index === 0}>↑</button>
                        <button className="btn" onClick={() => move(index, 1)} disabled={checked || index === currentOrder.length - 1}>↓</button>
                    </li>
                ))}
            </ul>
            {!checked && <button className="btn btn-primary" onClick={handleCheck}>تحقق</button>}
        </>
    );
}
export default OrderQuestion;