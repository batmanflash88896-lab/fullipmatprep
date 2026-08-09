import { NO_LATEX_RULE } from "@/lib/format";

const MODEL = "google/gemini-3.6-flash";

export type GeneratedQuestion = {
  section: "QA" | "VARC";
  topic: string;
  passage?: string | null;
  prompt: string;
  options: string[];
  correct_index: number;
  solution: string;
  trick?: string | null;
  common_mistake?: string | null;
};

export function extractQuestions(text: string): GeneratedQuestion[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text) as string;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Could not build this mock. Try again.");
  const parsed = JSON.parse(raw.slice(start, end + 1)) as { questions?: GeneratedQuestion[] };
  const questions = (parsed.questions ?? []).filter(
    (q) => q && Array.isArray(q.options) && q.options.length >= 2,
  );
  if (questions.length === 0) throw new Error("Could not build this mock. Try again.");
  return questions;
}

async function run(system: string, prompt: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
  const { streamText } = await import("ai");
  const gateway = createLovableAiGatewayProvider(key);
  const result = streamText({ model: gateway(MODEL), temperature: 0.4, system, prompt });
  const { aiError } = await import("@/lib/learn.server");
  let text: string;
  try {
    text = await result.text;
  } catch (e) {
    throw aiError(e);
  }
  return extractQuestions(text);
}

const SHAPE = `Return ONLY JSON:
{"questions":[{"section":"QA","topic":"Percentages","passage":null,"prompt":"...","options":["a","b","c","d"],"correct_index":0,"solution":"clear step-by-step working","trick":"the 20-second shortcut","common_mistake":"the trap in the wrong options"}]}

Rules:
- Exactly one correct option; the other three must be believable traps.
- Solutions are friendly, numbered steps, plain text, simple math notation (no LaTeX, no markdown).
- Every question needs a trick and a common_mistake.
- For VARC reading questions, put the passage text in "passage" and repeat the same passage on each question that uses it.

${NO_LATEX_RULE}`;

const SETTER = `You are an IPMAT paper setter who has taught the exam for 15 years and remembers every past paper. You reproduce exam-accurate practice papers.`;

export async function generatePyqPaper(exam: string, year: number, count: number) {
  const qaCount = Math.max(10, Math.round(count * 0.56));
  const varcCount = Math.max(8, count - qaCount);
  const [qa, varc] = await Promise.all([
    run(
      SETTER,
      `Create the Quantitative Ability section (section "QA") of a FULL LENGTH practice paper mirroring the ${exam} ${year} paper: same topic mix, same difficulty curve, same question styles used that year. Exactly ${qaCount} questions covering arithmetic, algebra, geometry, modern maths and data interpretation, easier first and hardest last.
${SHAPE}`,
    ),
    run(
      SETTER,
      `Create the Verbal Ability & Reading Comprehension section (section "VARC") of a FULL LENGTH practice paper mirroring the ${exam} ${year} paper. Exactly ${varcCount} questions: two short reading passages with 3 questions each, then vocabulary, grammar, para-jumble, para-summary and inference questions in the styles that paper used.
${SHAPE}`,
    ),
  ]);
  return [
    ...qa.map((q) => ({ ...q, section: "QA" as const })),
    ...varc.map((q) => ({ ...q, section: "VARC" as const })),
  ];
}

export function generateTopicPaper(
  chapter: string,
  topic: string,
  section: "QA" | "VARC",
  count: number,
  college: string | null,
) {
  return run(
    `You are an IPMAT paper setter. You build tight topic tests that check whether a student has truly mastered one topic.`,
    `Create a ${count}-question topic mock on IPMAT ${section} > Chapter "${chapter}" > Topic "${topic}".${
      college ? ` Calibrate difficulty to the ${college} paper.` : ""
    }
Mix: 4 easy warm-ups, then medium, then 2 exam-level stingers. Every question must be on this topic only.
${SHAPE}`,
  );
}
