import { NO_LATEX_RULE } from "@/lib/format";
import type { ExamPattern, PatternSection, SectionCode } from "@/lib/exam-patterns";

const MODEL = "google/gemini-3.6-flash";

export type GeneratedQuestion = {
  section: SectionCode;
  qtype: "mcq" | "tita";
  topic: string;
  passage?: string | null;
  prompt: string;
  options: string[] | null;
  correct_index: number | null;
  answer_text?: string | null;
  solution: string;
  trick?: string | null;
  common_mistake?: string | null;
};

export function extractQuestions(text: string, qtype: "mcq" | "tita" = "mcq"): GeneratedQuestion[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text) as string;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Could not build this mock. Try again.");
  const parsed = JSON.parse(raw.slice(start, end + 1)) as { questions?: GeneratedQuestion[] };
  const questions = (parsed.questions ?? []).filter((q) =>
    q && typeof q.prompt === "string" && q.prompt.trim().length > 0
      ? qtype === "tita"
        ? typeof q.answer_text === "string" && q.answer_text.trim().length > 0
        : Array.isArray(q.options) &&
          q.options.length >= 2 &&
          Number.isInteger(q.correct_index) &&
          (q.correct_index ?? -1) >= 0 &&
          (q.correct_index ?? -1) < q.options.length
      : false,
  );
  if (questions.length === 0) throw new Error("Could not build this mock. Try again.");
  return questions;
}

async function run(system: string, prompt: string, qtype: "mcq" | "tita" = "mcq") {
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
  return extractQuestions(text, qtype);
}

const SHAPE = `Return ONLY JSON:
{"questions":[{"topic":"Percentages","passage":null,"prompt":"...","options":["a","b","c","d"],"correct_index":0,"solution":"clear step-by-step working","trick":"the 20-second shortcut","common_mistake":"the trap in the wrong options"}]}

Rules:
- Exactly one correct option; the other three must be believable traps.
- Solutions are friendly, numbered steps, plain text, simple math notation (no LaTeX, no markdown).
- Every question needs a trick and a common_mistake.
- For VARC reading questions, put the passage text in "passage" and repeat the same passage on each question that uses it.

${NO_LATEX_RULE}`;

const SHAPE_TITA = `Return ONLY JSON:
{"questions":[{"topic":"Percentages","passage":null,"prompt":"...","options":null,"correct_index":null,"answer_text":"48","solution":"clear step-by-step working","trick":"the 20-second shortcut","common_mistake":"the usual slip"}]}

Rules:
- These are SHORT ANSWER (type-in) questions: there are NO options. "options" must be null.
- "answer_text" must be a single clean value the student can type — an integer, a decimal like 12.5, or a simple fraction like 3/4. Never a range, never units, never words.
- Solutions are friendly, numbered steps, plain text, simple math notation (no LaTeX, no markdown).
- Every question needs a trick and a common_mistake.

${NO_LATEX_RULE}`;

const SETTER = `You are an experienced entrance-exam practice-paper setter. Write original questions and never claim to reproduce an official or previous-year paper. Independently solve each question before finalising the answer key. Make the paper one notch harder than the typical actual exam so it builds confidence and resilience: favour multi-step reasoning, linked concepts, nuanced reading inference, data-rich sets and close but fair distractors. Keep every question within the exam's syllabus and achievable under its real section timing; do not use obscure tricks, excessive arithmetic, or ambiguity as artificial difficulty. Mix moderate and challenging questions, with a small number of genuine stretch questions. Ensure every answer matches its worked solution.`;

/** Big sections are generated in chunks so no single AI reply gets truncated. */
const CHUNK = 15;

async function generateSection(
  exam: string,
  year: number,
  pattern: ExamPattern,
  section: PatternSection,
): Promise<GeneratedQuestion[]> {
  const chunks: number[] = [];
  let left = section.count;
  while (left > 0) {
    chunks.push(Math.min(CHUNK, left));
    left -= CHUNK;
  }

  const results = await Promise.all(
    chunks.map(async (n, ci) => {
      let part: GeneratedQuestion[] = [];
      let lastError: unknown;
      for (let attempt = 0; attempt < 2 && part.length < n; attempt += 1) {
        try {
          part = await run(
        SETTER,
        `Create part ${ci + 1} of ${chunks.length} of the "${section.label}" section of an ORIGINAL FULL LENGTH practice paper for ${exam}, variation seed ${year} (${pattern.label}: ${pattern.durationMin} minutes, +${pattern.correct} for correct, −${pattern.negative} for a wrong MCQ).
Exactly ${n} questions. Cover ${section.brief}.
Difficulty: one notch above the typical ${exam} exam level, while remaining fair, syllabus-aligned, and solvable within the real section time. Use multi-concept steps, stronger distractors and careful interpretation. Include a few exam-topper stretch questions, but do not make the whole section extreme or rely on tedious arithmetic.
Do not repeat question ideas across parts; part ${ci + 1} must feel distinct.${
          section.code === "VARC" && section.qtype === "mcq"
            ? " Include at least one reading passage with 4 questions on it, then non-RC verbal questions."
            : ""
        }
${section.qtype === "tita" ? SHAPE_TITA : SHAPE}
This response is accepted only when the questions array contains exactly ${n} complete questions. Count carefully before replying.`,
            section.qtype,
          );
        } catch (error) {
          lastError = error;
        }
      }
      if (part.length < n) {
        if (lastError instanceof Error) throw lastError;
        throw new Error(`Sunny generated only ${part.length} of ${n} questions for ${section.label}. Please retry.`);
      }
      return part.slice(0, n);
    }),
  );

  return results.flat().slice(0, section.count).map((q) => ({
    ...q,
    section: section.code,
    qtype: section.qtype,
  }));
}

export async function generatePyqPaper(exam: string, year: number, pattern: ExamPattern) {
  const sections = await Promise.all(
    pattern.sections.map((s) => generateSection(exam, year, pattern, s)),
  );
  const paper = sections.flat();
  const expected = pattern.sections.reduce((sum, section) => sum + section.count, 0);
  if (paper.length !== expected) {
    throw new Error(`The paper is incomplete (${paper.length}/${expected} questions). Please retry.`);
  }
  return paper;
}

export function generateTopicPaper(
  chapter: string,
  topic: string,
  section: SectionCode,
  count: number,
  college: string | null,
) {
  return run(
    `You are an IPMAT paper setter. You build tight topic tests that check whether a student has truly mastered one topic.`,
    `Create a ${count}-question topic mock on IPMAT ${section} > Chapter "${chapter}" > Topic "${topic}".${
      college ? ` Calibrate difficulty to the ${college} paper.` : ""
    }
Make this topic test slightly harder than the actual exam: include 2 approachable warm-ups, mostly moderate-to-challenging multi-step questions, and 2 stretch questions. Keep questions fair and solvable within the test time; avoid obscure tricks or tedious arithmetic. Every question must stay on this topic only.
${SHAPE}`,
  ).then((qs) => qs.map((q) => ({ ...q, section, qtype: "mcq" as const })));
}
