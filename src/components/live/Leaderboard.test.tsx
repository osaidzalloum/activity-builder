import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Leaderboard from "./Leaderboard";

describe("Leaderboard", () => {
  it("shows the rank, name and points of every entry, in the given order", () => {
    render(
      <Leaderboard
        entries={[
          { rank: 1, name: "Amy", points: 2000 },
          { rank: 1, name: "Bob", points: 2000 },
          { rank: 3, name: "Cy", points: 100 },
        ]}
      />
    );

    const items = screen.getAllByRole("listitem");

    expect(items).toHaveLength(3);
    expect(items[0].textContent).toMatch(/1\s*Amy\s*2000/);
    expect(items[1].textContent).toMatch(/1\s*Bob\s*2000/);
    expect(items[2].textContent).toMatch(/3\s*Cy\s*100/);
  });

  it("renders a name as text, not as markup", () => {
    render(<Leaderboard entries={[{ rank: 1, name: "<b>hack</b>", points: 5 }]} />);

    expect(screen.getByText("<b>hack</b>")).toBeTruthy();
    expect(document.querySelector("li b")).toBeNull();
  });

  it("renders an empty list without items", () => {
    render(<Leaderboard entries={[]} />);

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});