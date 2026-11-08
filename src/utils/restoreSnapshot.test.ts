import { describe, expect, it } from "vitest";
import { mergeSnapshots, snapshotFromResults } from "./restoreSnapshot";
import type { SessionResults } from "../types";

const saved = (id: string, answers: Record<string, { choice: number; points: number }>) => ({
  id,
  text: id,
  options: ["x", "y", "z"],
  correctIndex: 1,
  answers,
});

const results = (questions: SessionResults["questions"]): SessionResults => ({
  players: {},
  questions,
});

describe("snapshotFromResults", () => {
  it("rebuilds the choices and the points of each revealed question", () => {
    const snapshot = snapshotFromResults(
      results([saved("q1", { a: { choice: 1, points: 1000 }, b: { choice: 0, points: 0 } })]),
      [{ id: "q1" }, { id: "q2" }]
    );

    expect(snapshot.scores).toEqual({ 0: { a: 1000, b: 0 } });
    expect(snapshot.answers).toEqual({
      0: { a: { choice: 1, receivedAt: 0 }, b: { choice: 0, receivedAt: 0 } },
    });
  });

  it("puts a question where it is now, matching by id and not by position", () => {
    // the activity was reordered since: q2 now comes first
    const snapshot = snapshotFromResults(
      results([saved("q1", { a: { choice: 1, points: 1000 } })]),
      [{ id: "q2" }, { id: "q1" }]
    );

    expect(Object.keys(snapshot.scores)).toEqual(["1"]);
    expect(snapshot.scores[1]).toEqual({ a: 1000 });
  });

  it("skips a saved question that no longer exists", () => {
    const snapshot = snapshotFromResults(
      results([
        saved("deleted", { a: { choice: 1, points: 1000 } }),
        saved("q1", { a: { choice: 1, points: 500 } }),
      ]),
      [{ id: "q1" }]
    );

    expect(snapshot.scores).toEqual({ 0: { a: 500 } });
  });

  it("returns an empty snapshot when nothing was saved", () => {
    expect(snapshotFromResults(results([]), [{ id: "q1" }])).toEqual({ answers: {}, scores: {} });
  });

  it("keeps a question that nobody answered, with no points", () => {
    const snapshot = snapshotFromResults(results([saved("q1", {})]), [{ id: "q1" }]);

    expect(snapshot.scores).toEqual({ 0: {} });
    expect(snapshot.answers).toEqual({ 0: {} });
  });

  it("keeps a player whose id is __proto__", () => {
    const answers = Object.fromEntries([["__proto__", { choice: 1, points: 1000 }]]);

    const snapshot = snapshotFromResults(results([saved("q1", answers)]), [{ id: "q1" }]);

    expect(Object.hasOwn(snapshot.scores[0], "__proto__")).toBe(true);
  });

  it("does not change what it was given", () => {
    const input = results([saved("q1", { a: { choice: 1, points: 1000 } })]);
    const copy = structuredClone(input);

    const snapshot = snapshotFromResults(input, [{ id: "q1" }]);
    snapshot.scores[0].a = 0;

    expect(input).toEqual(copy);
  });
});

describe("mergeSnapshots", () => {
  const local = {
    answers: { 0: { a: { choice: 0, receivedAt: 7 } }, 1: { b: { choice: 2, receivedAt: 9 } } },
    scores: { 0: { a: 0 } },
  };
  const fromDatabase = {
    answers: { 0: { a: { choice: 1, receivedAt: 0 } } },
    scores: { 0: { a: 1000 } },
  };

  it("lets the database win for the questions it knows", () => {
    const merged = mergeSnapshots(local, fromDatabase);

    expect(merged.scores[0]).toEqual({ a: 1000 });
    expect(merged.answers[0]).toEqual({ a: { choice: 1, receivedAt: 0 } });
  });

  it("keeps what only this browser knows, such as the answers to an open question", () => {
    const merged = mergeSnapshots(local, fromDatabase);

    expect(merged.answers[1]).toEqual({ b: { choice: 2, receivedAt: 9 } });
  });

  it("adds the questions the database knows and this browser does not", () => {
    const merged = mergeSnapshots(
      { answers: {}, scores: {} },
      { answers: { 2: {} }, scores: { 2: { c: 300 } } }
    );

    expect(merged.scores).toEqual({ 2: { c: 300 } });
  });

  it("returns an empty snapshot when both are empty", () => {
    expect(mergeSnapshots({ answers: {}, scores: {} }, { answers: {}, scores: {} })).toEqual({
      answers: {},
      scores: {},
    });
  });

  it("does not change what it was given", () => {
    const localCopy = structuredClone(local);
    const databaseCopy = structuredClone(fromDatabase);

    mergeSnapshots(local, fromDatabase);

    expect(local).toEqual(localCopy);
    expect(fromDatabase).toEqual(databaseCopy);
  });
});