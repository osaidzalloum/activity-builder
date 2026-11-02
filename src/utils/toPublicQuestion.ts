import type { Question, PublicQuestion } from "../types";

// Returns null for question types that live sessions don't support yet.
export function toPublicQuestion(question: Question): PublicQuestion | null {
    if (question.type !== "mcq") return null; 
    
    // Whitelist: copy only the fields we want students to see.

    return {
        id: question.id,
        type: "mcq",
        text: question.text,
        options: [...question.options],
    };
}