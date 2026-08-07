import type { Lesson } from "./learn.functions";

const MODEL = "google/gemini-3.6-flash";

export function extractJson(text: string): Lesson {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text) as string;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Sunny could not format this class. Try again.");
  return JSON.parse(raw.slice(start, end + 1)) as Lesson;
}

export async function generateLesson(
  chapter: string,
  topic: string,
  section: string,
  college: string | null,
): Promise<Lesson> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
  const { streamText } = await import("ai");

  const gateway = createLovableAiGatewayProvider(key);
  const target = college
    ? `The student is targeting ${college}. Calibrate difficulty and exam references to that paper.`
    : "";

  const result = streamText({
    model: gateway(MODEL),
    temperature: 0.5,
    system: `You are Sunny, India's most loved IPMAT teacher. You teach one micro-step at a time, like a live one-to-one class: one small idea, then instantly check it with a question, then the next small idea. Never dump a summary. Never write a paragraph longer than 4 short sentences. Talk like a friend — warm, energetic, funny, using "you", short lines, and 1-3 emojis per message. Plain text only, simple math notation (no LaTeX). Reply with ONLY a JSON object.`,
    prompt: `Build a live interactive class for IPMAT ${section} > Chapter "${chapter}" > Topic "${topic}". ${target}

Return JSON exactly in this shape:
{
  "intro": "1-2 lines, hype the topic and say what they will be able to do by the end 🚀",
  "beats": [
    {"kind":"teach","emoji":"🧠","text":"ONE tiny step only, 2-4 short sentences, with a concrete number example"},
    {"kind":"ask","prompt":"a question testing ONLY the step just taught","options":["a","b","c","d"],"correct_index":0,"solution":"step by step, friendly","trick":"the 5-second way","common_mistake":"the trap in the wrong options"},
    {"kind":"trick","title":"short trick name","text":"how to use it in under 20 seconds with a mini example"},
    {"kind":"mistake","text":"a trap students fall into + how to dodge it"}
  ],
  "wrap": "2 lines of encouragement + what to revise tonight 💪"
}

Hard rules:
- 22 to 30 beats total, strictly ordered from absolute zero to IPMAT level.
- Start from the most basic building block. Example for Percentages: first teach that 1/2 = 50%, 1/4 = 25%, then the fraction table, then conversion, then change, then successive change.
- After EVERY 1-2 "teach" beats there MUST be an "ask" beat on exactly that step. At least 10 "ask" beats overall, getting harder.
- Sprinkle at least 4 "trick" beats and 4 "mistake" beats, each placed right after the step it belongs to.
- Options must be plausible; exactly one correct.
- Every text is conversational and short. Emojis in most beats. No headings, no markdown, no bullet lists.`,
  });

  const text = await result.text;
  const lesson = extractJson(text);
  if (!Array.isArray(lesson.beats) || lesson.beats.length === 0) {
    throw new Error("Sunny could not build this class. Try again.");
  }
  return { ...lesson, version: 2 };
}