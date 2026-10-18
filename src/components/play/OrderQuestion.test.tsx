import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderQuestion from './OrderQuestion';
import type { OrderQuestion as OrderQuestionType } from '../../types';

// بدّل shuffle بدالة ثابتة: بتعكس المصفوفة
vi.mock('../../utils/shuffle', () => ({
  default: <T,>(array: T[]) => [...array].reverse(),
}));

const question: OrderQuestionType = {
  id: "q1",
  type: "order",
  text: "رتّب الأحرف",
  items: ["أ", "ب", "ج"],
};

function getItemsInOrder() {
  return screen.getAllByText(/^(أ|ب|ج)$/).map((el) => el.textContent);
}

describe('OrderQuestion', () => {
  it('shows the items in shuffled order', () => {
    render(<OrderQuestion question={question} onAnswer={() => {}} />);

    expect(getItemsInOrder()).toEqual(["ج", "ب", "أ"]);
  });

  it('reports a wrong answer when checked without reordering', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<OrderQuestion question={question} onAnswer={onAnswer} />);

    await user.click(screen.getByRole("button", { name: "تحقق" }));

    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it('reports a correct answer after reordering with the arrow buttons', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<OrderQuestion question={question} onAnswer={onAnswer} />);

    // ج ب أ  ←  ج أ ب
    await user.click(screen.getAllByRole("button", { name: "↑" })[2]);
    // ج أ ب  ←  أ ج ب
    await user.click(screen.getAllByRole("button", { name: "↑" })[1]);
    // أ ج ب  ←  أ ب ج
    await user.click(screen.getAllByRole("button", { name: "↑" })[2]);

    expect(getItemsInOrder()).toEqual(["أ", "ب", "ج"]);

    await user.click(screen.getByRole("button", { name: "تحقق" }));

    expect(onAnswer).toHaveBeenCalledWith(true);
  });
});