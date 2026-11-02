import { describe, expect, it } from "vitest";
import { calculateScore, MAX_POINTS, MIN_CORRECT_POINTS } from "./calculateScore";

const LIMIT = 20_000;

describe("calculateScore", () => {
    it("gives zero for a wrong answer, however fast", () => {
        expect(calculateScore(false, 0, LIMIT)).toBe(0);
    });

    it("gives the maximum for an instant correct answer", () => {
        expect(calculateScore(true, 0, LIMIT)).toBe(MAX_POINTS);
    });

    it("gives the minimum for a correct answer at the time limit", () => {
        expect(calculateScore(true, LIMIT, LIMIT)).toBe(MIN_CORRECT_POINTS);
    });

    it("score halfway through the time between the two extremes", () => {
        expect(calculateScore(true, LIMIT / 2, LIMIT)).toBe(750);
    });

    it("does not drop below the minimum after the limit", () => {
        expect(calculateScore(true, LIMIT * 5, LIMIT)).toBe(MIN_CORRECT_POINTS);
    });

    it("does not exceed the maximum for a negative elapsed time", () => {
        expect(calculateScore(true, -500, LIMIT)).toBe(MAX_POINTS);
    });

    it.each([
        ["NaN elapsed time", Number.NaN, LIMIT],
        ["infinite elapsed time", Number.POSITIVE_INFINITY, LIMIT],
        ["zero time limit", 1000, 0],
        ["negative time limit", 1000, -1],
    ])("gives the minimum for %s", (_label, elapsed, limit) => {
        expect(calculateScore(true, elapsed, limit)).toBe(MIN_CORRECT_POINTS);
    });

    it("never rewards a slower answer more than a faster one", () => {
        let previous = Infinity;
        for (let elapsed = 0; elapsed <= LIMIT * 2; elapsed += 500) {
            const score = calculateScore(true, elapsed, LIMIT);
            expect(score).toBeLessThanOrEqual(previous);
            previous = score;
        }
    });

    it("always returns a whole number", () => {
        expect(Number.isInteger(calculateScore(true, 3333, LIMIT))).toBe(true);
    });
})