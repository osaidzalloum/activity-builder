import { pick } from "zod/mini";
import type { McqQuestion, SessionResults } from "../types";
import type { ReceivedAnswer } from "./scoreQuestion";

type LiveQuestion = Pick<McqQuestion, "id" | "text" | "options" | "correctIndex">; 
type NamedPlayer = { id: string; name: string };

// Builds the whole saved record from what the host holds in memory.
// Pure and derived: running it again with the same input gives the same result, so a retry cannot add anything twice.
export function buildSessionResults(
    questions: readonly LiveQuestion[],
    answers: Readonly<Record<number, Readonly<Record<string, ReceivedAnswer>>>>,
    scores: Readonly<Record<number, Readonly<Record<string, number>>>>,
    players: readonly NamedPlayer[],
    previousNames: Readonly<Record<string, string>>
): SessionResults {
    // names of players who already left stay, names of connected players are refreshed
    const names = new Map<string, string>(Object.entries(previousNames));
    for (const player of players) names.set(player.id, player.name);

    const revealed: SessionResults["questions"] = [];

    questions.forEach((question, index) => {
        // only a question that was scored (revealed) is saved
        if (!Object.hasOwn(scores, index)) return;

        const answered = new Map<string, { choice: number; points: number }>();
        for (const [playerId, points] of Object.entries(scores[index])) {
            const answer = Object.hasOwn(answers[index] ?? {}, playerId)
              ? answers[index][playerId]
              : undefined;
            if (answer) answered.set(playerId, { choice: answer.choice, points });  
        }

        revealed.push({
            id: question.id,
            text: question.text,
            options: [...question.options],
            correctIndex: question.correctIndex,
            answers: Object.fromEntries(answered),
        });
    });

    return { players: Object.fromEntries(names), questions: revealed };
}