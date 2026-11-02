export const MAX_POINTS = 1000;
export const MIN_CORRECT_POINTS = 500;


export function calculateScore(
    isCorrect: boolean,
    elapsedMs: number,
    timeLimitMs: number
): number {
    if (!isCorrect) return 0;

    // garbage input earns the minimum, never the bonus
    if (!Number.isFinite(elapsedMs) || !Number.isFinite(timeLimitMs) || timeLimitMs <= 0) {
        return MIN_CORRECT_POINTS;
    }

    // 0 = answered instantly, 1 = answered at (or after) the limit
    const ratio = Math.min(Math.max(elapsedMs / timeLimitMs, 0), 1);
    return Math.round(MAX_POINTS * (1 - ratio / 2));
}