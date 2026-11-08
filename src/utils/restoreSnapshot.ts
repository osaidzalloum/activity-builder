import type { SessionResults } from "../types";
import type { HostSnapshot } from "./hostSnapshot";

// Rebuilds, from the saved results, what the host held in memory for the questions already revealed.
// `questions` are the live questions in order: a saved question is matched by id, not by position,
// so it still lands in the right place if the activity was edited since.
export function snapshotFromResults(
    results: SessionResults,
    questions: readonly { id: string } []
):HostSnapshot {
    const indexById = new Map(questions.map((question, index) => [question.id, index]));
    const answers: HostSnapshot["answers"] = {};
    const scores: HostSnapshot["scores"] = {};

    for (const saved of results.questions) {
        const index = indexById.get(saved.id);
        // a question deleted from the activity since has nowhere to go
        if (index === undefined) continue;

        const choices = new Map<string, { choice: number, receivedAt: number }>();
        const points = new Map<string, number>();
        for (const [playerId, answer] of Object.entries(saved.answers)) {
            // the arrival time is not saved, and a revealed question is already scored, so it is not needed
            choices.set(playerId, { choice: answer.choice, receivedAt: 0 });
            points.set(playerId, answer.points);
        }
        answers[index] = Object.fromEntries(choices);
        scores[index] = Object.fromEntries(points);
    }
    return { answers, scores };
}

// For each question the database knows (it was saved when revealed), the database wins.
// This browser keeps everything else, such as the answers to a question that is still open.
export function mergeSnapshots(local: HostSnapshot, saved: HostSnapshot): HostSnapshot {
    return {
        answers: { ...local.answers, ...saved.answers },
        scores: { ...local.scores, ...saved.scores },
    };
}