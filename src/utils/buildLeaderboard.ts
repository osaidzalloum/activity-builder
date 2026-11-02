type Player = { id: string; name: string };

export type LeaderboardEntry = Player & { points: number; rank: number };

export function buildLeaderboard(
  players: readonly Player[],
  totals: Readonly<Record<string, number>>
): LeaderboardEntry[] {
  const entries = players.map((player) => {
    // own properties only: ids come from clients
    const raw = Object.hasOwn(totals, player.id) ? totals[player.id] : 0;
    // garbage or negative points count as zero
    const points = Number.isFinite(raw) && raw > 0 ? raw : 0;
    return { ...player, points };
  });

  // map() made a new array, so the caller's list is not reordered
  entries.sort(
    (a, b) =>
      b.points - a.points ||
      a.name.localeCompare(b.name, "ar") ||
      a.id.localeCompare(b.id)
  );

  const ranked: LeaderboardEntry[] = [];
  entries.forEach((entry, index) => {
    const previous = ranked[index - 1];
    const rank = previous && previous.points === entry.points ? previous.rank : index + 1;
    ranked.push({ ...entry, rank });
  });
  return ranked;
}