import { describe, it, expect } from "vitest";
import { questionEventSchema } from "./schemas";

describe("questionEventSchema", () => {
  it("strips a leaked correctIndex from a question event", () => {
    const parsed = questionEventSchema.parse({
      index: 0,
      total: 1,
      startedAt: 1,
      question: {
        id: "q1",
        type: "mcq",
        text: "؟",
        options: ["أ", "ب"],
        correctIndex: 1,
      },
    });

    expect(parsed.question).not.toHaveProperty("correctIndex");
  });

  it("rejects an event without a question", () => {
    const result = questionEventSchema.safeParse({
      index: 0,
      total: 1,
      startedAt: 1,
    });

    expect(result.success).toBe(false);
  });
});