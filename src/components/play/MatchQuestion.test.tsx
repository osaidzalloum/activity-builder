import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MatchQuestion from './MatchQuestion';
import type { MatchQuestion as MatchQuestionType } from '../../types';

const question: MatchQuestionType = {
  id: "q1",
  type: "match",
  text: "طابق كل دولة بعاصمتها",
  pairs: [
    { left: "الأردن", right: "عمّان" },
    { left: "مصر", right: "القاهرة" },
  ],
};

describe('MatchQuestion', () => {
  it('keeps the check button disabled until every item is matched', async () => {
    const user = userEvent.setup();
    render(<MatchQuestion question={question} onAnswer={() => {}} />);

    expect(screen.getByRole("button", { name: "تحقق" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "الأردن" }));
    await user.click(screen.getByRole("button", { name: "عمّان" }));

    expect(screen.getByRole("button", { name: "تحقق" })).toBeDisabled();
  });

  it('reports a correct answer when all pairs match', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<MatchQuestion question={question} onAnswer={onAnswer} />);

    await user.click(screen.getByRole("button", { name: "الأردن" }));
    await user.click(screen.getByRole("button", { name: "عمّان" }));
    await user.click(screen.getByRole("button", { name: "مصر" }));
    await user.click(screen.getByRole("button", { name: "القاهرة" }));
    await user.click(screen.getByRole("button", { name: "تحقق" }));

    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('reports a wrong answer when pairs are swapped', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<MatchQuestion question={question} onAnswer={onAnswer} />);

    await user.click(screen.getByRole("button", { name: "الأردن" }));
    await user.click(screen.getByRole("button", { name: "القاهرة" }));
    await user.click(screen.getByRole("button", { name: "مصر" }));
    await user.click(screen.getByRole("button", { name: "عمّان" }));
    await user.click(screen.getByRole("button", { name: "تحقق" }));

    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it('unlinks the previous item when a right-side item is matched again', async () => {
    const user = userEvent.setup();
    render(<MatchQuestion question={question} onAnswer={() => {}} />);

    await user.click(screen.getByRole("button", { name: "الأردن" }));
    await user.click(screen.getByRole("button", { name: "عمّان" }));
    await user.click(screen.getByRole("button", { name: "مصر" }));
    await user.click(screen.getByRole("button", { name: "عمّان" }));

    expect(screen.getByRole("button", { name: "الأردن" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تحقق" })).toBeDisabled();
  });
});