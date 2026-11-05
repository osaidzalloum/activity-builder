import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudentQuestion from "./StudentQuestion";
import type { QuestionEvent, RevealEvent } from "../../types";

const current: QuestionEvent = {
  index: 1,
  total: 3,
  startedAt: 1000,
  scoring: "fixed",
  question: { id: "q2", type: "mcq", text: "ما ناتج 3+8؟", options: ["10", "11", "13"] },
};

const reveal: RevealEvent = {
  index: 1,
  correctIndex: 1,
  top: [{ name: "Amy", points: 2000, rank: 1 }],
  results: {},
};

const base = {
  current,
  selected: null,
  reveal: null,
  myResult: null,
  answerError: "",
  onChoose: () => {},
};

describe("StudentQuestion", () => {
  it("shows the progress, the question and every option as an enabled button", () => {
    render(<StudentQuestion {...base} />);

    expect(screen.getByText(/السؤال 2 من 3/)).toBeInTheDocument();
    expect(screen.getByText("ما ناتج 3+8؟")).toBeInTheDocument();
    for (const option of ["10", "11", "13"]) {
      expect(screen.getByRole("button", { name: option })).toBeEnabled();
    }
  });

  it("reports the index of the option the student clicks", async () => {
    const onChoose = vi.fn();
    const user = userEvent.setup();
    render(<StudentQuestion {...base} onChoose={onChoose} />);

    await user.click(screen.getByRole("button", { name: "13" }));

    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(2);
  });

  it("locks the options once an answer is chosen and says it arrived", () => {
    render(<StudentQuestion {...base} selected={0} />);

    expect(screen.getByRole("button", { name: "10" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "13" })).toBeDisabled();
    expect(screen.getByText(/وصل جوابك/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10" })).toHaveClass("active");
  });

  it("marks the correct option and a wrong choice after the reveal", () => {
    render(<StudentQuestion {...base} selected={0} reveal={reveal} />);

    expect(screen.getByRole("button", { name: "11" })).toHaveClass("correct");
    expect(screen.getByRole("button", { name: "10" })).toHaveClass("wrong");
    expect(screen.getByRole("button", { name: "13" })).not.toHaveClass("correct", "wrong");
    expect(screen.getByText(/إجابة خاطئة/)).toBeInTheDocument();
  });

  it("says the answer was right when the student chose the correct option", () => {
    render(<StudentQuestion {...base} selected={1} reveal={reveal} />);

    expect(screen.getByText(/إجابة صحيحة/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "11" })).not.toHaveClass("wrong");
  });

  it("says so when the student did not answer", () => {
    render(<StudentQuestion {...base} reveal={reveal} />);

    expect(screen.getByText(/ما جاوبت على هذا السؤال/)).toBeInTheDocument();
  });

  it("shows the points gained, the total, the rank and the top list after the reveal", () => {
    render(
      <StudentQuestion
        {...base}
        selected={1}
        reveal={reveal}
        myResult={{ gained: 1000, total: 2000, rank: 1 }}
      />
    );

    expect(screen.getByText("+1000")).toBeInTheDocument();
    expect(screen.getByText("2000", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("الأوائل")).toBeInTheDocument();
    expect(screen.getByText("Amy")).toBeInTheDocument();
  });

  it("shows the speed hint only in speed mode and only before the reveal", () => {
    const { rerender } = render(<StudentQuestion {...base} />);
    expect(screen.queryByText(/كلما جاوبت أسرع/)).not.toBeInTheDocument();

    rerender(<StudentQuestion {...base} current={{ ...current, scoring: "speed" }} />);
    expect(screen.getByText(/كلما جاوبت أسرع/)).toBeInTheDocument();

    rerender(
      <StudentQuestion {...base} current={{ ...current, scoring: "speed" }} reveal={reveal} />
    );
    expect(screen.queryByText(/كلما جاوبت أسرع/)).not.toBeInTheDocument();
  });

  it("shows the error when the answer did not arrive", () => {
    render(<StudentQuestion {...base} answerError="ما وصل جوابك، حاول مرة ثانية." />);

    expect(screen.getByText("ما وصل جوابك، حاول مرة ثانية.")).toBeInTheDocument();
  });
});