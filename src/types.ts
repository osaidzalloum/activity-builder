import type { z } from 'zod';
import type {
  mcqQuestionSchema, orderQuestionSchema, matchQuestionSchema,
  matchPairSchema, questionSchema, attemptAnswerSchema, attemptSchema
} from './schemas';

export type McqQuestion = z.infer<typeof mcqQuestionSchema>;
export type OrderQuestion = z.infer<typeof orderQuestionSchema>;
export type MatchQuestion = z.infer<typeof matchQuestionSchema>;
export type MatchPair = z.infer<typeof matchPairSchema>;
export type Question = z.infer<typeof questionSchema>;

export type AttemptAnswer = z.infer<typeof attemptAnswerSchema>;
export type Attempt = z.infer<typeof attemptSchema>;

export type QuestionDraft =
  | Omit<McqQuestion, "id">
  | Omit<OrderQuestion, "id">
  | Omit<MatchQuestion, "id">;

export type QuestionType = Question["type"];

export type Activity = {
  id: string;
  owner_id: string;
  title: string;
  questions: Question[];
  created_at: string;
};


export type PlayProps<Q extends Question> = {
  question: Q;
  onAnswer: (isCorrect: boolean) => void;
};

export type AttemptResult = {
  score: number;
  total: number;
  answers: AttemptAnswer[];
};