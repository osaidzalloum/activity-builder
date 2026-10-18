import type { ReactNode } from 'react';
import {
  DndContext, closestCenter, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import QuestionItem from './QuestionItem';
import type { Question } from '../types';
import useSortSensors from '../hooks/useSortSensors';


type QuestionListProps = {
  questions: Question[];
  onDeleteQuestion: (id: string) => void;
  onEditQuestion: (question: Question) => void;
  onReorder: (activeId: string, overId: string) => void;
};

function SortableQuestion({ id, children }: { id: string; children: ReactNode }) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      className="sortable-question"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <button
        type="button"
        className="drag-handle"
        ref={setActivatorNodeRef}
        aria-label="اسحب لإعادة ترتيب السؤال"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      {children}
    </div>
  );
}

function QuestionList({ questions, onDeleteQuestion, onEditQuestion, onReorder }: QuestionListProps) {
  const sensors = useSortSensors();
  if (questions.length === 0) {
    return <p>لا توجد أسئلة بعد</p>;
  }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
        {questions.map((question) => (
          <SortableQuestion key={question.id} id={question.id}>
            <QuestionItem
              question={question}
              onDeleteQuestion={onDeleteQuestion}
              onEditQuestion={onEditQuestion}
            />
          </SortableQuestion>
        ))}
      </SortableContext>
    </DndContext>
  );
}

export default QuestionList;
