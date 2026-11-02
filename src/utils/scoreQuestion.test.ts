import { describe, expect, it } from "vitest";
import { scoreQuestion, sumScores } from "./scoreQuestion";
import { MAX_POINTS, MIN_CORRECT_POINTS } from "./calculateScore";

const LIMIT = 20_000;

describe("scoreQuestion", () => {
  it("scores correct answers by speed and wrong answers as zero", () => {
    const scores = scoreQuestion(
      {
        fast: { choice: 1, receivedAt: 1000 },
        slow: { choice: 1, receivedAt: 1000 + LIMIT },
        wrong: { choice: 0, receivedAt: 1000 },
      },
      1,
      1000,
      LIMIT
    );

    expect(scores).toEqual({ fast: MAX_POINTS, slow: MIN_CORRECT_POINTS, wrong: 0 });
  });

  it("returns an empty result when nobody answered", () => {
    expect(scoreQuestion({}, 0, 1000, LIMIT)).toEqual({});
  });

  it("keeps a player whose id is __proto__", () => {
    const answers = Object.fromEntries([["__proto__", { choice: 0, receivedAt: 0 }]]);

    const scores = scoreQuestion(answers, 0, 0, LIMIT);

    expect(Object.hasOwn(scores, "__proto__")).toBe(true);
  });
});

describe("sumScores", () => {
  it("adds each player's points across questions", () => {
    const totals = sumScores({
      0: { a: 1000, b: 500 },
      1: { a: 700 },
    });

    expect(totals).toEqual({ a: 1700, b: 500 });
  });

  it("returns an empty result when there are no scores", () => {
    expect(sumScores({})).toEqual({});
  });

  it("does not mutate its input and gives the same result on every call", () => {
    const input = { 0: { a: 1000 }, 1: { a: 500 } };
    const snapshot = structuredClone(input);

    expect(sumScores(input)).toEqual(sumScores(input));
    expect(input).toEqual(snapshot);
  });
});