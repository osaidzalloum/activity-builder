import { describe, it, expect } from "vitest";
import { questionEventSchema } from "./schemas";

const event = { index: 0, total: 1, startedAt: 1, scoring: "fixed" as const };
const question = { id: "q1", type: "mcq", text: "؟", options: ["أ", "ب"] };

describe("questionEventSchema", () => {
  it("strips a leaked correctIndex from a question event", () => {
    const parsed = questionEventSchema.parse({
      ...event,
      question: { ...question, correctIndex: 1 },
    });

    expect(parsed.question).not.toHaveProperty("correctIndex");
  });

  it("rejects an event without a question", () => {
    expect(questionEventSchema.safeParse(event).success).toBe(false);
  });

  it("rejects an unknown scoring mode", () => {
    const result = questionEventSchema.safeParse({ ...event, scoring: "double", question });

    expect(result.success).toBe(false);
  });
});