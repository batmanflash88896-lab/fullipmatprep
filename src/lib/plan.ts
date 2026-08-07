import { ALL_CHAPTERS, type Chapter } from "@/lib/syllabus";

const BASE_WEIGHT: Record<string, number> = {
  "number-system": 10,
  "averages-mixtures-and-alligation": 6,
  "percentage-profit-and-loss-interest": 11,
  "ratio-proportion-and-variation": 7,
  "time-speed-distance-and-work": 9,
  algebra: 13,
  geometry: 9,
  mensuration: 6,
  "modern-maths": 9,
  "data-interpretation-and-logical-reasoning": 8,
  "reading-comprehension": 13,
  vocabulary: 10,
  grammar: 9,
  "verbal-reasoning": 9,
};

const COLLEGE_TILT: Record<string, { QA: number; VARC: number; dilr: number }> = {
  "IIM Indore": { QA: 1.3, VARC: 0.85, dilr: 0.9 },
  "IIM Rohtak": { QA: 1, VARC: 1, dilr: 1.5 },
  "IIM Bangalore": { QA: 1, VARC: 1.2, dilr: 1.1 },
  "JIPMAT (Jammu / Bodh Gaya / Amritsar)": { QA: 0.85, VARC: 1.25, dilr: 1.3 },
};

export type PlanBlock = {
  chapter: Chapter;
  days: number;
  topicsPerDay: number;
  questionsPerDay: number;
  priority: "High" | "Medium" | "Steady";
  share: number;
};

export function buildPlan(daysLeft: number, college: string | null) {
  const tilt = (college && COLLEGE_TILT[college]) || { QA: 1, VARC: 1, dilr: 1 };
  const learnDays = Math.max(7, Math.round(daysLeft * 0.7));
  const revisionDays = Math.max(3, Math.round(daysLeft * 0.18));
  const mockDays = Math.max(2, daysLeft - learnDays - revisionDays);

  const scored = ALL_CHAPTERS.map((ch) => {
    const base = BASE_WEIGHT[ch.slug] ?? 6;
    const dilr = ch.slug === "data-interpretation-and-logical-reasoning" ? tilt.dilr : 1;
    return { ch, score: base * tilt[ch.section] * dilr };
  });
  const total = scored.reduce((n, s) => n + s.score, 0);
  const maxScore = Math.max(...scored.map((s) => s.score));

  const blocks: PlanBlock[] = scored
    .sort((a, b) => b.score - a.score)
    .map(({ ch, score }) => {
      const share = score / total;
      const days = Math.max(2, Math.round(share * learnDays));
      return {
        chapter: ch,
        days,
        share,
        topicsPerDay: Math.max(1, Math.ceil(ch.topics.length / days)),
        questionsPerDay: Math.round(10 + share * 220),
        priority: score >= maxScore * 0.8 ? "High" : score >= maxScore * 0.55 ? "Medium" : "Steady",
      };
    });

  const dailyQuestions = Math.min(90, Math.max(25, Math.round(2400 / Math.max(daysLeft, 12)) + 20));

  return { blocks, learnDays, revisionDays, mockDays, dailyQuestions };
}

export function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86_400_000));
}