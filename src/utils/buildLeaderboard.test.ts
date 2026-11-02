import { describe, expect, it } from "vitest";
import { buildLeaderboard } from "./buildLeaderboard";

const p = (id: string, name = id) => ({ id, name });

describe("buildLeaderboard", () => {
  it("sorts players by points, highest first", () => {
    const board = buildLeaderboard([p("a"), p("b"), p("c")], { a: 100, b: 300, c: 200 });

    expect(board.map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(board.map((e) => e.points)).toEqual([300, 200, 100]);
  });

  it("keeps players with no score on the board with zero points", () => {
    const board = buildLeaderboard([p("a"), p("b")], { a: 100 });

    expect(board.find((e) => e.id === "b")?.points).toBe(0);
  });

  it("gives tied players the same rank and skips the next one", () => {
    const board = buildLeaderboard(
      [p("p1"), p("p2"), p("p3"), p("p4")],
      { p1: 500, p2: 300, p3: 300, p4: 100 }
    );

    expect(board.map((e) => e.rank)).toEqual([1, 2, 2, 4]);
  });

  it("orders tied players by name", () => {
    const board = buildLeaderboard([p("x", "Bob"), p("y", "Amy")], { x: 100, y: 100 });

    expect(board.map((e) => e.name)).toEqual(["Amy", "Bob"]);
  });

  it("ranks everyone first when nobody has scored", () => {
    const board = buildLeaderboard([p("a"), p("b")], {});

    expect(board.map((e) => e.rank)).toEqual([1, 1]);
  });

  it("ignores totals of players who are no longer connected", () => {
    const board = buildLeaderboard([p("a")], { a: 100, "left-player": 900 });

    expect(board).toHaveLength(1);
    expect(board[0].rank).toBe(1);
  });

  it.each([
    ["NaN", Number.NaN],
    ["a negative number", -50],
    ["infinity", Number.POSITIVE_INFINITY],
  ])("treats %s as zero points", (_label, points) => {
    const board = buildLeaderboard([p("a")], { a: points });

    expect(board[0].points).toBe(0);
  });

  it.each(["constructor", "toString", "__proto__"])(
    "does not read the inherited name %s as a score",
    (id) => {
      const board = buildLeaderboard([p(id)], {});

      expect(board[0].points).toBe(0);
    }
  );

  it("does not reorder the list it was given", () => {
    const players = [p("a"), p("b")];

    buildLeaderboard(players, { a: 1, b: 2 });

    expect(players.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("returns an empty board when nobody is connected", () => {
    expect(buildLeaderboard([], { a: 100 })).toEqual([]);
  });
});