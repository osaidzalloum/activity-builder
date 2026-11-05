import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FinalStandings from "./FinalStandings";

const top = [
  { name: "Amy", points: 2000, rank: 1 },
  { name: "Bob", points: 1500, rank: 2 },
];

describe("FinalStandings", () => {
  it("shows the student's own total and rank", () => {
    render(<FinalStandings mine={{ total: 1500, rank: 2 }} top={top} onLeave={() => {}} />);

    expect(screen.getByText("1500", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("2", { selector: "strong" })).toBeInTheDocument();
  });

  it("lists the top players", () => {
    render(<FinalStandings mine={null} top={top} onLeave={() => {}} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Amy")).toBeInTheDocument();
  });

  it("shows neither a personal result nor a list when there is nothing to show", () => {
    render(<FinalStandings mine={null} top={[]} onLeave={() => {}} />);

    expect(screen.queryByText(/مجموعك/)).not.toBeInTheDocument();
    expect(screen.queryByText("الأوائل")).not.toBeInTheDocument();
  });

  it("leaves the session when the button is clicked", async () => {
    const onLeave = vi.fn();
    const user = userEvent.setup();
    render(<FinalStandings mine={null} top={top} onLeave={onLeave} />);

    await user.click(screen.getByRole("button", { name: "جلسة جديدة" }));

    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});