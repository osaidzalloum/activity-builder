import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SortableItemProps = {
  id: string;
  disabled: boolean;
  className: string;
  children: ReactNode;
};
function SortableItem({ id, disabled, className, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: disabled ? "default" : "grab",
  };

  return (
    <li ref={setNodeRef} style={style} className={className} {...attributes} {...listeners}>
      {children}
    </li>
  );
}


export default SortableItem;