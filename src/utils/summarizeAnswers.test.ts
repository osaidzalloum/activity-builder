import { describe, expect, it } from "vitest";
import { summarizeAnswers } from "./summarizeAnswers";

describe("summarizeAnswers", () => {
  it("counts how many players chose each option", () => {
    const players = [{ id: "player-1" }, { id: "player-2" }, { id: "player-3" }];
    const answers = { "player-1": 0, "player-2": 1, "player-3": 1 };

    const summary = summarizeAnswers(players, answers, 3);

    expect(summary.answeredCount).toBe(3);
    expect(summary.counts).toEqual([1, 2, 0]);
    expect(summary.countFor(1)).toBe(2);
  });

  it("does not count players who have not answered", () => {
    const players = [{ id: "player-1" }, { id: "player-2" }];

    const summary = summarizeAnswers(players, { "player-1": 0 }, 2);

    expect(summary.answeredCount).toBe(1);
    expect(summary.counts).toEqual([1, 0]);
  });

  it("returns zero counts when there are no answers", () => {
    const summary = summarizeAnswers([{ id: "player-1" }], {}, 4);

    expect(summary.answeredCount).toBe(0);
    expect(summary.counts).toEqual([0, 0, 0, 0]);
  });

  it("returns zero counts when there are no players", () => {
    const summary = summarizeAnswers([], { "player-1": 0 }, 2);

    expect(summary.answeredCount).toBe(0);
    expect(summary.counts).toEqual([0, 0]);
  });

  it("ignores answers from players who are no longer connected", () => {
    const summary = summarizeAnswers(
      [{ id: "player-1" }],
      { "player-1": 0, "left-player": 1 },
      2
    );

    expect(summary.answeredCount).toBe(1);
    expect(summary.countFor(1)).toBe(0);
  });

  it.each(["constructor", "toString", "__proto__"])(
    "does not treat the inherited name %s as an answer",
    (id) => {
      const summary = summarizeAnswers([{ id }], {}, 2);

      expect(summary.answeredCount).toBe(0);
    }
  );

  it.each([7, -1, 1.5, Number.NaN])(
    "ignores the invalid choice %s",
    (choice) => {
      const summary = summarizeAnswers([{ id: "player-1" }], { "player-1": choice }, 4);

      expect(summary.answeredCount).toBe(0);
      expect(summary.counts).toEqual([0, 0, 0, 0]);
    }
  );

  it("returns zero for an option index that does not exist", () => {
    const summary = summarizeAnswers([], {}, 2);

    expect(summary.countFor(9)).toBe(0);
  });
});