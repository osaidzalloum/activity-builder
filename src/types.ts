type BaseQuestion = {
  id: string;
  text: string;
};

export type McqQuestion = BaseQuestion & {
  type: "mcq";
  options: string[];
  correctIndex: number;
};

export type OrderQuestion = BaseQuestion & {
  type: "order";
  items: string[];
};

export type MatchPair = { left: string; right: string };

export type MatchQuestion = BaseQuestion & {
  type: "match";
  pairs: MatchPair[];
};

export type Question = McqQuestion | OrderQuestion | MatchQuestion;

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