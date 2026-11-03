import { buildRevealSummary } from "./buildRevealSummary";
import type { LeaderboardEntry } from "./buildLeaderboard";


// Final standings: the reveal summary without the per-question gain.

export function buildFinalSummary(board: readonly LeaderboardEntry[], topCount = 5) {
    const { top, results } = buildRevealSummary(board, {}, topCount);

    return {
        top,
        results: Object.fromEntries(
            Object.entries(results).map(([id, r]) => [id, { total: r.total, rank: r.rank }])
        ),
    };
}