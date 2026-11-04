import { describe, expect, it } from "vitest";
import { calculateScore, MAX_POINTS, MIN_CORRECT_POINTS } from "./calculateScore";

const LIMIT = 20_000;

describe("calculateScore in fixed mode", () => {
  it("gives zero for a wrong answer", () => {
    expect(calculateScore(false, 0, LIMIT, "fixed")).toBe(0);
  });

  it.each([
    ["an instant answer", 0],
    ["an answer at the limit", LIMIT],
    ["an answer long after the limit", LIMIT * 5],
    ["a negative time", -500],
    ["a time that is not a number", Number.NaN],
  ])("gives the full points for %s", (_label, elapsed) => {
    expect(calculateScore(true, elapsed, LIMIT, "fixed")).toBe(MAX_POINTS);
  });

  it("gives two correct answers the same points whoever was faster", () => {
    expect(calculateScore(true, 1_000, LIMIT, "fixed")).toBe(
      calculateScore(true, 18_000, LIMIT, "fixed")
    );
  });
});

describe("calculateScore in speed mode", () => {
  it("gives zero for a wrong answer, however fast", () => {
    expect(calculateScore(false, 0, LIMIT, "speed")).toBe(0);
  });

  it("gives the maximum for an instant correct answer", () => {
    expect(calculateScore(true, 0, LIMIT, "speed")).toBe(MAX_POINTS);
  });

  it("gives the minimum for a correct answer at the time limit", () => {
    expect(calculateScore(true, LIMIT, LIMIT, "speed")).toBe(MIN_CORRECT_POINTS);
  });

  it("scores halfway through the time between the two extremes", () => {
    expect(calculateScore(true, LIMIT / 2, LIMIT, "speed")).toBe(900);
  });

  it("does not drop below the minimum after the limit", () => {
    expect(calculateScore(true, LIMIT * 5, LIMIT, "speed")).toBe(MIN_CORRECT_POINTS);
  });

  it("does not exceed the maximum for a negative elapsed time", () => {
    expect(calculateScore(true, -500, LIMIT, "speed")).toBe(MAX_POINTS);
  });

  it.each([
    ["NaN elapsed time", Number.NaN, LIMIT],
    ["infinite elapsed time", Number.POSITIVE_INFINITY, LIMIT],
    ["zero time limit", 1000, 0],
    ["negative time limit", 1000, -1],
  ])("gives the minimum for %s", (_label, elapsed, limit) => {
    expect(calculateScore(true, elapsed, limit, "speed")).toBe(MIN_CORRECT_POINTS);
  });

  it("never rewards a slower answer more than a faster one", () => {
    let previous = Infinity;
    for (let elapsed = 0; elapsed <= LIMIT * 2; elapsed += 500) {
      const score = calculateScore(true, elapsed, LIMIT, "speed");
      expect(score).toBeLessThanOrEqual(previous);
      previous = score;
    }
  });

  it("keeps every correct answer between the minimum and the maximum", () => {
    for (let elapsed = -1000; elapsed <= LIMIT * 2; elapsed += 250) {
      const score = calculateScore(true, elapsed, LIMIT, "speed");
      expect(score).toBeGreaterThanOrEqual(MIN_CORRECT_POINTS);
      expect(score).toBeLessThanOrEqual(MAX_POINTS);
    }
  });

  it("always returns a whole number", () => {
    expect(Number.isInteger(calculateScore(true, 3333, LIMIT, "speed"))).toBe(true);
  });
});