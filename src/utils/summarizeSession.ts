import type { SessionResults } from "../types";
import { buildLeaderboard, type LeaderboardEntry } from "./buildLeaderboard";

export const UNKNOWN_PLAYER_NAME = "غير معروف";

export type QuestionSummary = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  answeredCount: number;
  correctCount: number;
  // null when nobody answered, so the page can say so instead of showing 0%
  percent: number | null;
  // how many players chose each option
  optionCounts: number[];
};

export type PlayerSummary = LeaderboardEntry & { correct: number; answered: number };

type Tally = { correct: number; answered: number; points: number };

// Turns the saved record into what the review page shows.
// Pure: nothing here reads the clock or the network.
export function summarizeSession(results: SessionResults): {
  players: PlayerSummary[];
  questions: QuestionSummary[];
} {
  const tallies = new Map<string, Tally>();
  const tallyOf = (playerId: string): Tally => {
    let tally = tallies.get(playerId);
    if (!tally) {
      tally = { correct: 0, answered: 0, points: 0 };
      tallies.set(playerId, tally);
    }
    return tally;
  };

  // everyone who joined is listed, even a player who never answered
  for (const playerId of Object.keys(results.players)) tallyOf(playerId);

  const questions = results.questions.map((question): QuestionSummary => {
    const optionCounts = question.options.map(() => 0);
    let answeredCount = 0;
    let correctCount = 0;

    for (const [playerId, answer] of Object.entries(question.answers)) {
      // a choice outside the real options is not an answer
      const valid =
        Number.isInteger(answer.choice) &&
        answer.choice >= 0 &&
        answer.choice < question.options.length;
      if (!valid) continue;

      const isCorrect = answer.choice === question.correctIndex;
      const tally = tallyOf(playerId);

      answeredCount++;
      optionCounts[answer.choice]++;
      tally.answered++;
      tally.points += answer.points;
      if (isCorrect) {
        correctCount++;
        tally.correct++;
      }
    }

    return {
      id: question.id,
      text: question.text,
      options: [...question.options],
      correctIndex: question.correctIndex,
      answeredCount,
      correctCount,
      percent: answeredCount === 0 ? null : Math.round((correctCount / answeredCount) * 100),
      optionCounts,
    };
  });

  const named = [...tallies.keys()].map((id) => ({
    id,
    name: Object.hasOwn(results.players, id) ? results.players[id] : UNKNOWN_PLAYER_NAME,
  }));
  const totals = Object.fromEntries([...tallies].map(([id, tally]) => [id, tally.points]));

  const players = buildLeaderboard(named, totals).map((entry) => {
    const tally = tallies.get(entry.id) ?? { correct: 0, answered: 0, points: 0 };
    return { ...entry, correct: tally.correct, answered: tally.answered };
  });

  return { players, questions };
}