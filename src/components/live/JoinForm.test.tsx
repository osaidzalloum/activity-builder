import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JoinForm from "./JoinForm";

async function fill(user: ReturnType<typeof userEvent.setup>, code: string, name: string) {
  await user.type(screen.getByLabelText("كود الجلسة"), code);
  await user.type(screen.getByLabelText("اسمك"), name);
}

describe("JoinForm", () => {
  it("hands the typed code and name to onJoin", async () => {
    const onJoin = vi.fn().mockResolvedValue(null);
    const user = userEvent.setup();
    render(<JoinForm onJoin={onJoin} />);

    await fill(user, "abc123", "Amy");
    await user.click(screen.getByRole("button", { name: "انضم" }));

    expect(onJoin).toHaveBeenCalledWith("abc123", "Amy");
  });

  it("shows the message onJoin returns and lets the student try again", async () => {
    const onJoin = vi.fn().mockResolvedValue("الكود غير صحيح، أو الجلسة انتهت.");
    const user = userEvent.setup();
    render(<JoinForm onJoin={onJoin} />);

    await fill(user, "ZZZZZZ", "Amy");
    await user.click(screen.getByRole("button", { name: "انضم" }));

    expect(await screen.findByText("الكود غير صحيح، أو الجلسة انتهت.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "انضم" })).toBeEnabled();
  });

  it("disables the button while it is joining", async () => {
    let finish: (message: string | null) => void = () => {};
    const onJoin = vi.fn(
      () => new Promise<string | null>((resolve) => { finish = resolve; })
    );
    const user = userEvent.setup();
    render(<JoinForm onJoin={onJoin} />);

    await fill(user, "ABC123", "Amy");
    await user.click(screen.getByRole("button", { name: "انضم" }));

    expect(screen.getByRole("button", { name: "جاري الانضمام..." })).toBeDisabled();

    finish("خطأ");
    expect(await screen.findByText("خطأ")).toBeInTheDocument();
  });

  it("clears an old error when the student submits again", async () => {
    const onJoin = vi.fn().mockResolvedValueOnce("خطأ أول").mockResolvedValueOnce(null);
    const user = userEvent.setup();
    render(<JoinForm onJoin={onJoin} />);

    await fill(user, "ABC123", "Amy");
    await user.click(screen.getByRole("button", { name: "انضم" }));
    expect(await screen.findByText("خطأ أول")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "انضم" }));
    await vi.waitFor(() => expect(screen.queryByText("خطأ أول")).not.toBeInTheDocument());
  });
});