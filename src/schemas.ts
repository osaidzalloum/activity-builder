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

export const questionsSchema = z.array(questionSchema);