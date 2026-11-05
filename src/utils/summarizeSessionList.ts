import type { LiveSession, ScoringMode } from "../types";
import { summarizeSession } from "./summarizeSession";

type SessionRow = Pick<
    LiveSession,
    "id" | "code" | "created_at" | "ended_at" | "scoring_mode" | "results"
>;

export type SessionListItem = {
    id: string;
    code: string;
    createdAt: string;
    scoringMode: ScoringMode;
    playerCount: number;
    revealedCount: number;
    status: "active" | "ended";
    // only an ended session can be deleted, so a teacher cannot remove one that is still running
    canDelete: boolean;
};

// an unreadable date counts as the oldest, so it sinks to the bottom of the list
const time = (iso: string) => {
    const value = Date.parse(iso);
    return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
};

// Turns the saved sessions of an activity into rows for the list page, newest first.
// Pure: nothing here reads the clock or the network.
export function summarizeSessionList(sessions: readonly SessionRow[]): SessionListItem[] {
    return sessions
        .map((session): SessionListItem => {
            const ended = session.ended_at !== null;
            return {
                id: session.id,
                code: session.code,
                createdAt: session.created_at,
                scoringMode: session.scoring_mode,
                playerCount: summarizeSession(session.results).players.length,
                revealedCount: session.results.questions.length,
                status: ended ? "ended" : "active",
                canDelete: ended,
            };
        })
        .sort((a, b) => {
            const byDate = time(b.createdAt) - time(a.createdAt);
            // two equal dates (or two unreadable ones) still get a fixed order
            return Number.isNaN(byDate) || byDate === 0 ? a.code.localeCompare(b.code) : byDate;
        })
}