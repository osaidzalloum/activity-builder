import { calculateScore } from "./calculateScore";
import type { ScoringMode } from "../types";

export type ReceivedAnswer = { choice: number; receivedAt: number };

// Scores every received answer for one question.
// Pure: no state, no clock; the caller passes everything in.

export function scoreQuestion(
    answers: Readonly<Record<string, ReceivedAnswer>>,
    correctIndex: number,
    startedAt: number,
    timeLimitMs: number,
    mode: ScoringMode
): Record<string, number> {
    return Object.fromEntries(
        Object.entries(answers).map(([playerId, answer]) => [
            playerId,
            calculateScore(
                answer.choice === correctIndex, 
                answer.receivedAt - startedAt, 
                timeLimitMs,
                mode
            ),
        ])
    );
}

// Totals are derived from per-question scores, so recomputing is always safe.

 export function sumScores(
    scoresByQuestion: Readonly<Record<number, Readonly<Record<string, number>>>>
 ): Record<string, number> {
    const totlals = new Map<string, number>();
    for (const scores of Object.values(scoresByQuestion)) {
        for (const [playerId, points] of Object.entries(scores)){
            totlals.set(playerId, (totlals.get(playerId) ?? 0) + points);
        }
    }
    return Object.fromEntries(totlals);
 }