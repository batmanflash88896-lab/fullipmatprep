const KEY = "ascendipm-guest-v1";

export type GuestData = {
  topics: Record<string, "learning" | "mastered">;
  quiz: { correct: number; total: number; at: string }[];
};

const empty: GuestData = { topics: {}, quiz: [] };

export function readGuest(): GuestData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as GuestData) } : empty;
  } catch {
    return empty;
  }
}

export function writeGuest(data: GuestData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full or disabled */
  }
}

export const GUEST_QUESTIONS = [
  {
    prompt: "A price rises by 25% and then falls by 20%. Net change?",
    options: ["No change", "5% increase", "5% decrease", "10% increase"],
    correct: 0,
    solution: "100 → 125 → 125 × 0.8 = 100. Net change is 0%.",
    trick: "Successive change: a + b + ab/100 = 25 − 20 − 5 = 0.",
  },
  {
    prompt: "If a : b = 3 : 4 and b : c = 6 : 7, then a : c is",
    options: ["9 : 14", "3 : 7", "18 : 28", "2 : 3"],
    correct: 0,
    solution: "Make b equal: 9 : 12 and 12 : 14, so a : c = 9 : 14.",
    trick: "Match the shared term before comparing outer terms.",
  },
  {
    prompt: "What is the remainder when 7¹⁰³ is divided by 5?",
    options: ["3", "2", "4", "1"],
    correct: 0,
    solution: "7ⁿ mod 5 cycles 2, 4, 3, 1. 103 mod 4 = 3, so the remainder is 3.",
    trick: "Find the cycle, then reduce the power by the cycle length.",
  },
  {
    prompt: "Choose the best word: Her argument was so ____ that even her critics agreed.",
    options: ["cogent", "verbose", "tenuous", "specious"],
    correct: 0,
    solution: "Critics agreeing means the argument was convincing: cogent.",
    trick: "“Even … agreed” signals a positive word.",
  },
  {
    prompt: "Which sentence is correct?",
    options: [
      "Neither of the two answers is correct.",
      "Neither of the two answers are correct.",
      "Neither of the two answers were correct.",
      "None of the two answers are correct.",
    ],
    correct: 0,
    solution: "“Neither” is singular, so it takes “is”.",
    trick: "Cover the “of the …” phrase and match the verb to the real subject.",
  },
];