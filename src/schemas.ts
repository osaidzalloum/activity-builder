import { z } from 'zod';

const baseQuestion = z.object({
  id: z.string(),
  text: z.string(),
});

export const mcqQuestionSchema = baseQuestion.extend({
  type: z.literal("mcq"),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
});

export const orderQuestionSchema = baseQuestion.extend({
  type: z.literal("order"),
  items: z.array(z.string()).min(2),
});

export const matchPairSchema = z.object({
  left: z.string(),
  right: z.string(),
});

export const matchQuestionSchema = baseQuestion.extend({
  type: z.literal("match"),
  pairs: z.array(matchPairSchema).min(2),
});

export const questionSchema = z.discriminatedUnion("type", [
  mcqQuestionSchema,
  orderQuestionSchema,
  matchQuestionSchema,
]);

export const attemptAnswerSchema = z.object({
  questionId: z.string(),
  correct: z.boolean(),
});

export const attemptSchema = z.object({
  id: z.string(),
  student_name: z.string(),
  score: z.number(),
  total: z.number(),
  answers: z.array(attemptAnswerSchema),
  created_at: z.string(),
});

export const questionsSchema = z.array(questionSchema);
export const attemptsSchema = z.array(attemptSchema);

export const sessionStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("lobby") }),
  z.object({
    status: z.literal("question"),
    index: z.number().int().min(0),
    startedAt: z.number(),
  }),
  z.object({
    status: z.literal("reveal"),
    index: z.number().int().min(0),
  }),
  z.object({ status: z.literal("finished") }),
]);

export const liveSessionSchema = z.object({
  id: z.string(),
  activity_id: z.string(),
  host_id: z.string(),
  code: z.string(),
  state: sessionStateSchema,
  created_at: z.string(),
  ended_at: z.string().nullable(),
});

export const joinedSessionsSchema = z.array(
  z.object({
    session_id: z.string(),
    activity_id: z.string(),
    state: sessionStateSchema,
  })
);

export const participantSchema = z.object({
  id: z.string().max(64),
  name: z.string().trim().min(1).max(50),
  role: z.enum(["host", "player"]),
});