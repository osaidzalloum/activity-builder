import type { LeaderboardEntry } from "./buildLeaderboard";

export type PlayerResult = { gained: number; total: number; rank: number };

export function buildRevealSummary(
  board: readonly LeaderboardEntry[],
  questionScores: Readonly<Record<string, number>>,
  topCount = 5
) {
  const results = new Map<string, PlayerResult>();
  for (const entry of board) {
    // own properties only: ids come from clients
    const gained = Object.hasOwn(questionScores, entry.id) ? questionScores[entry.id] : 0;
    results.set(entry.id, { gained, total: entry.points, rank: entry.rank });
  }

  // whitelist: the top list carries names, never ids
  const top = board
    .slice(0, topCount)
    .map(({ name, points, rank }) => ({ name, points, rank }));

  return { top, results: Object.fromEntries(results) };
}