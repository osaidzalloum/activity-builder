type Player = { id: string };

export function summarizeAnswers(
  players: readonly Player[],
  answers: Record<string, number>,
  optionCount: number
) {
  let answeredCount = 0;
  const counts = Array.from({ length: optionCount }, () => 0);

  for (const player of players) {
    // own properties only: ids come from clients, so "constructor" must not count
    if (!Object.hasOwn(answers, player.id)) continue;

    const choice = answers[player.id];
    // an answer outside the real options is ignored, not counted
    if (!Number.isInteger(choice) || choice < 0 || choice >= optionCount) continue;

    answeredCount++;
    counts[choice]++;
  }

  return {
    answeredCount,
    counts,
    countFor: (optionIndex: number) => counts[optionIndex] ?? 0,
  };
}