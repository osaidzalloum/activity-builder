import { describe, expect, it } from "vitest";
import { emptySnapshot, parseHostSnapshot, serializeHostSnapshot } from "./hostSnapshot";

describe("hostSnapshot", () => {
  it("returns an empty snapshot when nothing is stored", () => {
    expect(parseHostSnapshot(null)).toEqual(emptySnapshot());
  });

  it("returns an empty snapshot for text that is not JSON", () => {
    expect(parseHostSnapshot("{oops")).toEqual(emptySnapshot());
  });

  it("returns an empty snapshot when the shape is wrong", () => {
    expect(parseHostSnapshot(JSON.stringify({ answers: 5 }))).toEqual(emptySnapshot());
  });

  it("rejects a negative choice instead of keeping part of the data", () => {
    const raw = JSON.stringify({
      answers: { 0: { a: { choice: -1, receivedAt: 1 } } },
      scores: {},
    });

    expect(parseHostSnapshot(raw)).toEqual(emptySnapshot());
  });

  it("restores exactly what was saved", () => {
    const snapshot = {
      answers: { 0: { a: { choice: 1, receivedAt: 1500 } } },
      scores: { 0: { a: 1000 } },
    };

    expect(parseHostSnapshot(serializeHostSnapshot(snapshot))).toEqual(snapshot);
  });

  it("never shares the empty snapshot between calls", () => {
    const first = parseHostSnapshot(null);
    first.scores[0] = { a: 1 };

    expect(parseHostSnapshot(null)).toEqual({ answers: {}, scores: {} });
  });
});