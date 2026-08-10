export type QType = "mcq" | "tita";
export type SectionCode = "QA" | "VARC" | "LR";

export type PatternSection = {
  key: string;
  code: SectionCode;
  label: string;
  short: string;
  qtype: QType;
  count: number;
  /** what the AI should cover in this section */
  brief: string;
};

export type ExamPattern = {
  key: string;
  label: string;
  durationMin: number;
  /** marks per correct answer */
  correct: number;
  /** marks deducted per wrong MCQ (positive number) */
  negative: number;
  /** marks deducted per wrong short-answer question */
  negativeTita: number;
  sections: PatternSection[];
  notes: string[];
};

const QA_BRIEF =
  "arithmetic (percentages, ratio, averages, time-speed-distance, time & work, profit-loss, mixtures), algebra (equations, inequalities, logs, progressions, functions), number system, geometry & mensuration, permutation-combination-probability, set theory, matrices/determinants and data interpretation";
const VARC_BRIEF =
  "reading comprehension passages, para-jumbles, para-summary, sentence completion, error spotting, grammar, vocabulary in context, idioms and inference";
const LR_BRIEF =
  "arrangements, blood relations, coding-decoding, syllogisms, series, direction sense, puzzles, data sufficiency and logical data interpretation sets";

export const EXAM_PATTERNS: Record<string, ExamPattern> = {
  indore: {
    key: "indore",
    label: "IPMAT Indore pattern",
    durationMin: 120,
    correct: 4,
    negative: 1,
    negativeTita: 0,
    sections: [
      {
        key: "qa-mcq",
        code: "QA",
        label: "Quantitative Ability — MCQ",
        short: "QA (MCQ)",
        qtype: "mcq",
        count: 45,
        brief: QA_BRIEF,
      },
      {
        key: "qa-sa",
        code: "QA",
        label: "Quantitative Ability — Short Answer",
        short: "QA (SA)",
        qtype: "tita",
        count: 15,
        brief: `${QA_BRIEF}. These are type-in answers with no options, so every answer must be a clean number`,
      },
      {
        key: "varc-mcq",
        code: "VARC",
        label: "Verbal Ability & Reading Comprehension — MCQ",
        short: "VARC (MCQ)",
        qtype: "mcq",
        count: 45,
        brief: VARC_BRIEF,
      },
    ],
    notes: [
      "105 questions in 120 minutes — QA-MCQ 45, QA Short Answer 15, VARC-MCQ 45.",
      "+4 for a correct answer, −1 for a wrong MCQ.",
      "Short-answer questions carry no negative marking, so never leave a solvable one blank.",
    ],
  },
  rohtak: {
    key: "rohtak",
    label: "IPMAT Rohtak pattern",
    durationMin: 120,
    correct: 4,
    negative: 1,
    negativeTita: 0,
    sections: [
      {
        key: "qa",
        code: "QA",
        label: "Quantitative Ability",
        short: "QA",
        qtype: "mcq",
        count: 40,
        brief: QA_BRIEF,
      },
      {
        key: "lr",
        code: "LR",
        label: "Logical Reasoning",
        short: "LR",
        qtype: "mcq",
        count: 40,
        brief: LR_BRIEF,
      },
      {
        key: "varc",
        code: "VARC",
        label: "Verbal Ability",
        short: "VARC",
        qtype: "mcq",
        count: 40,
        brief: VARC_BRIEF,
      },
    ],
    notes: [
      "120 questions in 120 minutes — 40 Quantitative, 40 Logical Reasoning, 40 Verbal Ability.",
      "All questions are MCQs: +4 for correct, −1 for wrong.",
      "One minute per question, so speed matters more than depth here.",
    ],
  },
  jipmat: {
    key: "jipmat",
    label: "JIPMAT pattern (Jammu · Bodh Gaya · Amritsar)",
    durationMin: 150,
    correct: 4,
    negative: 1,
    negativeTita: 0,
    sections: [
      {
        key: "qa",
        code: "QA",
        label: "Quantitative Ability",
        short: "QA",
        qtype: "mcq",
        count: 33,
        brief: QA_BRIEF,
      },
      {
        key: "lr",
        code: "LR",
        label: "Logical Reasoning",
        short: "LR",
        qtype: "mcq",
        count: 33,
        brief: LR_BRIEF,
      },
      {
        key: "varc",
        code: "VARC",
        label: "Verbal Ability & Reading Comprehension",
        short: "VARC",
        qtype: "mcq",
        count: 34,
        brief: VARC_BRIEF,
      },
    ],
    notes: [
      "100 questions in 150 minutes — 33 Quantitative, 33 Logical Reasoning, 34 Verbal.",
      "+4 for correct, −1 for wrong.",
      "Difficulty sits around CBSE class 10–12 level, so accuracy decides the cut-off.",
    ],
  },
};

export const TOPIC_PATTERN: ExamPattern = {
  key: "topic",
  label: "Topic test",
  durationMin: 15,
  correct: 4,
  negative: 1,
  negativeTita: 0,
  sections: [],
  notes: ["Short topic test with IPMAT-level marking: +4 correct, −1 wrong."],
};

export function getPattern(key: string | null | undefined): ExamPattern {
  return (key && EXAM_PATTERNS[key]) || TOPIC_PATTERN;
}

export function patternForExam(exam: string): ExamPattern {
  if (exam === "IPMAT Rohtak") return EXAM_PATTERNS.rohtak;
  if (exam === "IPMAT Indore" || exam === "IPM Ranchi") return EXAM_PATTERNS.indore;
  return EXAM_PATTERNS.jipmat;
}

export const SECTION_LABEL: Record<SectionCode, string> = {
  QA: "Quantitative Ability",
  VARC: "Verbal Ability & RC",
  LR: "Logical Reasoning",
};