import type { z } from 'zod';
import type {
  mcqQuestionSchema, orderQuestionSchema, matchQuestionSchema,
  matchPairSchema, questionSchema, attemptAnswerSchema, 
  attemptSchema, sessionStateSchema, liveSessionSchema, 
  joinedSessionsSchema, participantSchema, publicQuestionSchema, 
  questionEventSchema, answerEventSchema, revealEventSchema, 
  finalEventSchema, scoringModeSchema
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

export type SessionState = z.infer<typeof sessionStateSchema>;
export type LiveSession = z.infer<typeof liveSessionSchema>;
export type JoinedSession = z.infer<typeof joinedSessionsSchema>[number];
export type PublicQuestion = z.infer<typeof publicQuestionSchema>;
export type QuestionEvent = z.infer<typeof questionEventSchema>;
export type AnswerEvent = z.infer<typeof answerEventSchema>;
export type RevealEvent = z.infer<typeof revealEventSchema>;
export type FinalEvent = z.infer<typeof finalEventSchema>;
export type ScoringMode = z.infer<typeof scoringModeSchema>;
export type Participant = z.infer<typeof participantSchema>;