import { z } from "zod";

const receivedAnswerSchema = z.object({
    choice: z.number().int().min(0),
    receivedAt: z.number(),
});

export const hostSnapshotSchema = z.object({
    // question index -> player id -> answer
    answers: z.record(z.string(), z.record(z.string(), receivedAnswerSchema)),
    // question index -> player id -> points
    scores: z.record(z.string(), z.record(z.string(),z.number())),
});

export type HostSnapshot = z.infer<typeof hostSnapshotSchema>;

export const EMPTY_SNAPSHOT: HostSnapshot = { answers: {}, scores: {} };

// Storage can hold old, corrupt, or edited data: anything invalid becomes an empty snapshot.
export function parseHostSnapshot(raw: string | null): HostSnapshot {
    if (raw === null) return EMPTY_SNAPSHOT;

    let json: unknown;
    try {
        json = JSON.parse(raw);
    } catch {
        return EMPTY_SNAPSHOT;
    }

    const parsed = hostSnapshotSchema.safeParse(json);
    return parsed.success ? parsed.data : EMPTY_SNAPSHOT;
}

export function serializeHostSnapshot(snapshot: HostSnapshot): string {
    return JSON.stringify(snapshot);
}