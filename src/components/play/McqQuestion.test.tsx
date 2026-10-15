import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import McqQuestion from './McqQuestion';
import type { McqQuestion as McqQuestionType } from '../../types';

const question: McqQuestionType = {
    id: "q1",
    type: "mcq",
    text: "ما ناتج 2 + 2؟",
    options: ["3", "4", "5", "6"],
    correctIndex: 1,
};

describe('McqQuestion', () => {
    it('shows the question text and all options', () => {
        render(<McqQuestion question={question} onAnswer={() => { }} />);

        expect(screen.getByText("ما ناتج 2 + 2؟")).toBeInTheDocument();
        expect(screen.getAllByRole("button")).toHaveLength(4);
    });
    it('reports a wrong answer', async () => {
        const onAnswer = vi.fn();
        const user = userEvent.setup();
        render(<McqQuestion question={question} onAnswer={onAnswer} />);

        await user.click(screen.getByRole("button", { name: "3" }));

        expect(onAnswer).toHaveBeenCalledWith(false);
    });
    it('reports a correct answer', async () => {
        const onAnswer = vi.fn();
        const user = userEvent.setup();
        render(<McqQuestion question={question} onAnswer={onAnswer} />);

        await user.click(screen.getByRole("button", { name: "4" }));

        expect(onAnswer).toHaveBeenCalledWith(true);
    });
    it('disables all options after answering', async () => {
        const user = userEvent.setup();
        render(<McqQuestion question={question} onAnswer={() => { }} />);

        await user.click(screen.getByRole("button", { name: "5" }));

        for (const button of screen.getAllByRole("button")) {
            expect(button).toBeDisabled();
        }
    });
});

