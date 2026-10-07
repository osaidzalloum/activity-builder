import { useState } from 'react';

import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import SortableItem from './SortableItem';
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

    const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);

function handleDragEnd(event) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  setCurrentOrder((order) =>
    arrayMove(order, order.indexOf(active.id), order.indexOf(over.id))
  );
}
    return (
        <>
            <p>{question.text}</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={currentOrder} strategy={verticalListSortingStrategy}>
            <ul className="options">
                {currentOrder.map((item, index) => (
                    <SortableItem  key={item} id={item} disabled={checked} className={getItemClass(item, index)}>
                        <span>{item}</span>
                        <button className="btn" onClick={() => move(index, -1)} disabled={checked || index === 0}>↑</button>
                        <button className="btn" onClick={() => move(index, 1)} disabled={checked || index === currentOrder.length - 1}>↓</button>
                    </SortableItem>
                ))}
            </ul>
            </SortableContext>
            </DndContext>
            {!checked && <button className="btn btn-primary" onClick={handleCheck}>تحقق</button>}

            
        </>
    );
}
export default OrderQuestion;