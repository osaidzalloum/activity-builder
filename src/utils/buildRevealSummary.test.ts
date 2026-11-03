import { describe, expect, it } from "vitest";
import { buildRevealSummary } from "./buildRevealSummary";

const entry = (id: string, name: string, points: number, rank: number) => ({
    id,
    name,
    points,
    rank,
});

describe("buildRevealSummary", () => {
    it("gives each player their own gained points, total and rank", () => {
        const board = [entry("a", "Amy", 1700, 1), entry("b", "Bob", 500, 2)];

        const { results } = buildRevealSummary(board, { a: 700, b: 500 });

        expect(results).toEqual({
            a: { gained: 700, total: 1700, rank: 1 },
            b: { gained: 500, total: 500, rank: 2 },
        });
    });

    it("limits the top list to the requested size", () => {
        const board = Array.from({ length: 8 }, (_, i) => entry(`p${i}`, `P${i}`, 800 - i, i + 1));

        expect(buildRevealSummary(board, {}, 5).top).toHaveLength(5);
    });

    it("exposes only name, points and rank in the top list, never the id", () => {
        const { top } = buildRevealSummary([entry("secret-id", "Amy", 100, 1)], {});

        expect(Object.keys(top[0]).sort()).toEqual(["name", "points", "rank"]);
    });

    it("ignores scores of players who are not on the board", () => {
        const { results } = buildRevealSummary([entry("a", "Amy", 100, 1)], { a: 100, gone: 900 });

        expect(Object.keys(results)).toEqual(["a"]);
    });

    it.each(["constructor", "toString"])(
        "does not read the inherited name %s as points",
        (id) => {
            const { results } = buildRevealSummary([entry(id, "X", 0, 1)], {});

            expect(results[id].gained).toBe(0);
        }
    );

    it("returns empty results for an empty board", () => {
        expect(buildRevealSummary([], { a: 100 })).toEqual({ top: [], results: {} });
    });
})