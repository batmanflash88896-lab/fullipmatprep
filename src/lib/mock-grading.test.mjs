import { describe, expect, test } from "bun:test";
import { countMockCorrect, normalizeMockAnswer } from "./mock-grading.ts";

describe("mock answer grading", () => {
  test("matches equivalent numeric short answers", () => {
    expect(normalizeMockAnswer(" 3/4 ")).toBe("0.75");
    expect(normalizeMockAnswer("0.750")).toBe("0.75");
    expect(normalizeMockAnswer("1,200")).toBe("1200");
  });

  test("grades only the correct submitted option and type-in answer", () => {
    const questions = [
      { id: "mcq-1", qtype: "mcq", correct_index: 2, answer_text: null },
      { id: "tita-1", qtype: "tita", correct_index: null, answer_text: "3/4" },
    ];
    expect(countMockCorrect(questions, { answers: { "mcq-1": 2 }, typed: { "tita-1": "0.75" } })).toBe(2);
    expect(countMockCorrect(questions, { answers: { "mcq-1": 1 }, typed: { "tita-1": "0.7" } })).toBe(0);
  });
});