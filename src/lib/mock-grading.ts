export type MockGradingQuestion = {
  id: string;
  qtype: "mcq" | "tita";
  correct_index: number | null;
  answer_text: string | null;
};

export type MockResponses = {
  answers: Record<string, number>;
  typed: Record<string, string>;
};

export function normalizeMockAnswer(value: string) {
  const trimmed = value.trim().replace(/\s+/g, "").replace(/,/g, "");
  if (!trimmed) return "";
  const fraction = trimmed.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  const number = fraction ? Number(fraction[1]) / Number(fraction[2]) : Number(trimmed);
  if (Number.isFinite(number)) return String(Math.round(number * 1e6) / 1e6);
  return trimmed.toLowerCase();
}

export function isMockAnswerCorrect(
  question: MockGradingQuestion,
  responses: MockResponses,
) {
  if (question.qtype === "tita") {
    const answer = responses.typed[question.id];
    return Boolean(answer && question.answer_text && normalizeMockAnswer(answer) === normalizeMockAnswer(question.answer_text));
  }
  return responses.answers[question.id] === question.correct_index;
}

export function countMockCorrect(questions: MockGradingQuestion[], responses: MockResponses) {
  return questions.filter((question) => isMockAnswerCorrect(question, responses)).length;
}