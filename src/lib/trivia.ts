import shuffle from '../utils/shuffle';
import type { QuestionDraft } from '../types';

// شكل الرد من الـ API (وصفناه من الـ JSON اللي شفناه)
type TriviaResponse = {
  response_code: number;
  results: {
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
  }[];
};

export async function fetchTriviaQuestions(amount: number, signal?: AbortSignal): Promise<QuestionDraft[]> {
  const url = `/api/trivia?amount=${amount}`;

  const response = await fetch(url, { signal });

  // fetch ما بيعتبر 404 أو 500 خطأ! لازم نفحص بنفسنا
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data: TriviaResponse = await response.json();

  // هالـ API بيرجع 200 حتى لو صار خطأ، والخطأ الحقيقي بـ response_code
  if (data.response_code !== 0) {
    throw new Error(`Trivia API error: ${data.response_code}`);
  }

  // نحوّل من شكلهم لشكلنا
  return data.results.map((item) => {
    const correct = decodeURIComponent(item.correct_answer);
    const options = shuffle([correct, ...item.incorrect_answers.map(decodeURIComponent)]);

    return {
      type: "mcq",
      text: decodeURIComponent(item.question),
      options,
      correctIndex: options.indexOf(correct),
    };
  });
}