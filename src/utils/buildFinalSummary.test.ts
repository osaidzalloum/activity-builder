import { describe, expect, it } from "vitest";
import { buildFinalSummary } from "./buildFinalSummary";

const entry = (id: string, name: string, points: number, rank: number) => ({
  id,
  name,
  points,
  rank,
});

describe("buildFinalSummary", () => {
  it("gives each player their total and rank, without a per-question gain", () => {
    const { results } = buildFinalSummary([entry("a", "Amy", 1700, 1)]);

    expect(results).toEqual({ a: { total: 1700, rank: 1 } });
  });

  it("limits the top list and never exposes ids in it", () => {
    const board = Array.from({ length: 7 }, (_, i) => entry(`p${i}`, `P${i}`, 700 - i, i + 1));

    const { top } = buildFinalSummary(board);

    expect(top).toHaveLength(5);
    expect(Object.keys(top[0]).sort()).toEqual(["name", "points", "rank"]);
  });

  it("returns an empty summary for an empty board", () => {
    expect(buildFinalSummary([])).toEqual({ top: [], results: {} });
  });
});