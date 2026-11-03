import { z } from "zod";
import { participantSchema } from "../schemas";

const storedAnswerSchema = z.object({
  index: z.number().int().min(0),
  choice: z.number().int().min(0),
});

export const storedPlayerSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{6}$/),
  name: participantSchema.shape.name,
  playerId: z.string().min(1).max(64),
  // the last answer this player sent, so a refresh cannot change it
  answer: storedAnswerSchema.optional(),
});

export type StoredPlayer = z.infer<typeof storedPlayerSchema>;

// Storage can hold old, corrupt, or edited data: anything invalid means "no stored player".
export function parseStoredPlayer(raw: string | null): StoredPlayer | null {
  if (raw === null) return null;

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }

  const parsed = storedPlayerSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

export function serializeStoredPlayer(player: StoredPlayer): string {
  return JSON.stringify(player);
}