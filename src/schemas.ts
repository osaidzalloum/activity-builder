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