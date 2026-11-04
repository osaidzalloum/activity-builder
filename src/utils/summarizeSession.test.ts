import { describe, expect, it } from "vitest";
import { summarizeSession, UNKNOWN_PLAYER_NAME } from "./summarizeSession";
import type { SessionResults } from "../types";

const question = (
  id: string,
  answers: Record<string, { choice: number; points: number }>,
  options = ["a", "b", "c"]
) => ({ id, text: `Question ${id}`, options, correctIndex: 1, answers });

const results = (
  players: Record<string, string>,
  questions: SessionResults["questions"]
): SessionResults => ({ players, questions });

describe("summarizeSession", () => {
  it("adds up each player's points and ranks them", () => {
    const summary = summarizeSession(
      results({ a: "Amy", b: "Bob" }, [
        question("q1", { a: { choice: 1, points: 1000 }, b: { choice: 0, points: 0 } }),
        question("q2", { a: { choice: 1, points: 900 }, b: { choice: 1, points: 800 } }),
      ])
    );

    expect(summary.players.map((p) => [p.name, p.points, p.rank])).toEqual([
      ["Amy", 1900, 1],
      ["Bob", 800, 2],
    ]);
  });

  it("counts how many questions each player answered and got right", () => {
    const summary = summarizeSession(
      results({ a: "Amy" }, [
        question("q1", { a: { choice: 1, points: 1000 } }),
        question("q2", { a: { choice: 0, points: 0 } }),
      ])
    );

    expect(summary.players[0]).toMatchObject({ answered: 2, correct: 1 });
  });

  it("keeps a player who never answered, with zero points", () => {
    const summary = summarizeSession(
      results({ a: "Amy", b: "Bob" }, [question("q1", { a: { choice: 1, points: 1000 } })])
    );

    const bob = summary.players.find((p) => p.id === "b");
    expect(bob).toMatchObject({ points: 0, answered: 0, correct: 0 });
  });

  it("shares a rank between tied players", () => {
    const summary = summarizeSession(
      results({ a: "Amy", b: "Bob" }, [
        question("q1", { a: { choice: 1, points: 1000 }, b: { choice: 1, points: 1000 } }),
      ])
    );

    expect(summary.players.map((p) => p.rank)).toEqual([1, 1]);
  });

  it("works out the success rate and the choices of each question", () => {
    const summary = summarizeSession(
      results({ a: "A", b: "B", c: "C", d: "D" }, [
        question("q1", {
          a: { choice: 1, points: 1000 },
          b: { choice: 1, points: 1000 },
          c: { choice: 0, points: 0 },
          d: { choice: 2, points: 0 },
        }),
      ])
    );

    expect(summary.questions[0]).toMatchObject({
      answeredCount: 4,
      correctCount: 2,
      percent: 50,
      optionCounts: [1, 2, 1],
    });
  });

  it("gives no percentage to a question nobody answered", () => {
    const summary = summarizeSession(results({ a: "Amy" }, [question("q1", {})]));

    expect(summary.questions[0]).toMatchObject({ answeredCount: 0, percent: null });
  });

  it.each([7, -1, 1.5, Number.NaN])("ignores the invalid choice %s", (choice) => {
    const summary = summarizeSession(
      results({ a: "Amy" }, [question("q1", { a: { choice, points: 500 } })])
    );

    expect(summary.questions[0].answeredCount).toBe(0);
    expect(summary.questions[0].optionCounts).toEqual([0, 0, 0]);
    expect(summary.players[0]).toMatchObject({ points: 0, answered: 0 });
  });

  it("names a player who answered but has no saved name", () => {
    const summary = summarizeSession(
      results({}, [question("q1", { ghost: { choice: 1, points: 1000 } })])
    );

    expect(summary.players[0]).toMatchObject({ name: UNKNOWN_PLAYER_NAME, points: 1000 });
  });

  it("does not read the inherited name constructor as a saved name", () => {
    const summary = summarizeSession(
      results({}, [question("q1", { constructor: { choice: 1, points: 1000 } })])
    );

    expect(summary.players[0].name).toBe(UNKNOWN_PLAYER_NAME);
  });

  it("returns empty lists when nothing was saved", () => {
    expect(summarizeSession(results({}, []))).toEqual({ players: [], questions: [] });
  });

  it("does not change its input and returns copies", () => {
    const input = results({ a: "Amy" }, [question("q1", { a: { choice: 1, points: 1000 } })]);
    const snapshot = structuredClone(input);

    const summary = summarizeSession(input);
    summary.questions[0].options.push("x");

    expect(input).toEqual(snapshot);
  });
});