import { describe, expect, it } from "vitest";
import { toPublicQuestion } from "./toPublicQuestion";
import type { McqQuestion, OrderQuestion, MatchQuestion } from "../types";

const mcq: McqQuestion = {
    id: "q1",
    type: "mcq",
    text: "ما ناتج 2 + 2؟",
    options: ["3", "4", "5", "6"],
    correctIndex: 1,
};

describe("toPublicQuestion", () => {
    it("never includes the correct answer", () => {
        const result = toPublicQuestion(mcq);

        expect(result).not.toBeNull();
        expect(result).not.toHaveProperty("correctIndex");
    });

    it("exposes only the whitelisted fields", () => {
        const result = toPublicQuestion(mcq);

        expect(Object.keys(result ?? {}).sort()).toEqual(["id", "options", "text", "type"]);
    });

    it("does not leak fields added to the question later", () => {
        const withSecret = { ...mcq, explanation: "because 2 + 2 = 4" } as McqQuestion;
        const result = toPublicQuestion(withSecret);

        expect(result).not.toHaveProperty("explanation");
    });

    it("returns null for ordering questions", () => {
        const order: OrderQuestion = {
            id: "q2",
            type: "order",
            text: "رتّب الأحرف",
            items: ["أ", "ب", "ج"],
        };
        expect(toPublicQuestion(order)).toBeNull();
    });
    it("returns null for matching questions", () => {
        const match: MatchQuestion = {
            id: "q2",
            type: "match",
            text: "ربط العناصر",
            pairs: [
                { left: "أ", right: "1" },
                { left: "ب", right: "2" },
                { left: "ج", right: "3" },
            ],
        };
        expect(toPublicQuestion(match)).toBeNull();
    });

    it("returns a copy of the options, not the original array", () => {
        const result = toPublicQuestion(mcq);

        expect(result?.options).toEqual(mcq.options);
        expect(result?.options).not.toBe(mcq.options);
    });
});