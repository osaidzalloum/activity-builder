import { describe, expect, it } from "vitest";
import { buildSessionResults } from "./buildSessionResults";

const q = (id: string) => ({ id, text: `Question ${id}`, options: ["a", "b", "c"], correctIndex: 1 });
const answer = (choice: number) => ({ choice, receivedAt: 1000 });

describe("buildSessionResults", () => {
  it("saves only the questions that were revealed, in order", () => {
    const results = buildSessionResults(
      [q("q1"), q("q2"), q("q3")],
      { 0: { a: answer(1) }, 1: { a: answer(0) } },
      { 0: { a: 1000 } },
      [{ id: "a", name: "Amy" }],
      {}
    );

    expect(results.questions.map((x) => x.id)).toEqual(["q1"]);
  });

  it("saves what each player chose and earned, keyed by player id", () => {
    const results = buildSessionResults(
      [q("q1")],
      { 0: { a: answer(1), b: answer(2) } },
      { 0: { a: 1000, b: 0 } },
      [{ id: "a", name: "Amy" }, { id: "b", name: "Bob" }],
      {}
    );

    expect(results.questions[0].answers).toEqual({
      a: { choice: 1, points: 1000 },
      b: { choice: 2, points: 0 },
    });
  });

  it("copies the question text, options and correct answer", () => {
    const results = buildSessionResults([q("q1")], { 0: {} }, { 0: {} }, [], {});

    expect(results.questions[0]).toMatchObject({
      id: "q1",
      text: "Question q1",
      options: ["a", "b", "c"],
      correctIndex: 1,
    });
  });

  it("keeps the names of players who left and refreshes the others", () => {
    const results = buildSessionResults(
      [],
      {},
      {},
      [{ id: "a", name: "Amy B." }],
      { a: "Amy", gone: "Zed" }
    );

    expect(results.players).toEqual({ a: "Amy B.", gone: "Zed" });
  });

  it("saves a revealed question nobody answered", () => {
    const results = buildSessionResults([q("q1")], {}, { 0: {} }, [], {});

    expect(results.questions).toHaveLength(1);
    expect(results.questions[0].answers).toEqual({});
  });

  it("skips a score that has no matching answer", () => {
    const results = buildSessionResults([q("q1")], { 0: {} }, { 0: { ghost: 500 } }, [], {});

    expect(results.questions[0].answers).toEqual({});
  });

  it("returns an empty record when nothing was revealed", () => {
    expect(buildSessionResults([q("q1")], {}, {}, [], {})).toEqual({ players: {}, questions: [] });
  });

  it("gives the same result when it runs again with the same input", () => {
    const run = () =>
      buildSessionResults([q("q1")], { 0: { a: answer(1) } }, { 0: { a: 1000 } }, [{ id: "a", name: "Amy" }], {});

    expect(run()).toEqual(run());
  });

  it("does not change its input and returns copies", () => {
    const questions = [q("q1")];
    const snapshot = structuredClone(questions);

    const results = buildSessionResults(questions, { 0: {} }, { 0: {} }, [], {});
    results.questions[0].options.push("x");

    expect(questions).toEqual(snapshot);
  });

  it.each(["constructor", "toString"])(
    "does not read the inherited name %s as an answer",
    (id) => {
      const results = buildSessionResults([q("q1")], { 0: {} }, { 0: { [id]: 900 } }, [], {});

      expect(results.questions[0].answers).toEqual({});
    }
  );
});