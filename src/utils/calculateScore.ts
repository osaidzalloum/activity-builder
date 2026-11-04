import type { ScoringMode } from "../types";

export const MAX_POINTS = 1000;
export const MIN_CORRECT_POINTS = 800;


export function calculateScore(
    isCorrect: boolean,
    elapsedMs: number,
    timeLimitMs: number,
    mode: ScoringMode
): number {
    if (!isCorrect) return 0;

    // fixed: every correct answer is worth the same, the time does not matter
    if (mode === "fixed") return MAX_POINTS;

    // speed: garbage input earns the minimum, never the bonus
    if (!Number.isFinite(elapsedMs) || !Number.isFinite(timeLimitMs) || timeLimitMs <= 0) {
        return MIN_CORRECT_POINTS;
    }
    
    // 0 = answered instantly, 1 = answered at (or after) the limit
    const ratio = Math.min(Math.max(elapsedMs / timeLimitMs, 0), 1);
    return Math.round(MIN_CORRECT_POINTS + (MAX_POINTS - MIN_CORRECT_POINTS) * (1 - ratio));
}