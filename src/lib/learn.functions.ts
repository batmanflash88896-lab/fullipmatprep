import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findTopic } from "@/lib/syllabus";

export type PracticeQ = {
  prompt: string;
  options: string[];
  correct_index: number;
  solution: string;
  trick: string;
  common_mistake: string;
};

export type Lesson = {
  hook: string;
  concept: { heading: string; body: string }[];
  formulas: string[];
  tricks: { title: string; body: string }[];
  worked_examples: { question: string; slow_way: string; fast_way: string; answer: string }[];
  common_mistakes: string[];
  exam_insight: string;
  practice: PracticeQ[];
};

const MODEL = "google/gemini-3.6-flash";

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Sunny could not format this lesson. Try again.");
  return JSON.parse(raw.slice(start, end + 1)) as Lesson;
}

async function generateLesson(chapter: string, topic: string, section: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
  const { streamText } = await import("ai");

  const gateway = createLovableAiGatewayProvider(key);
  const result = streamText({
    model: gateway(MODEL),
    temperature: 0.4,
    system: `You are Sunny, an elite IPMAT (IIM Indore/Rohtak) coach who teaches like the best offline classroom teacher in India. You explain from absolute zero, with intuition first, then rules, then exam shortcuts. You are warm, energetic and concrete. Never be vague. Use plain text with simple math notation (no LaTeX). Reply with ONLY a JSON object, no prose outside it.`,
    prompt: `Create a complete classroom lesson for IPMAT ${section} > Chapter "${chapter}" > Topic "${topic}".

Return JSON exactly in this shape:
{
  "hook": "2 sentences: why this topic matters in IPMAT and how many marks it typically carries",
  "concept": [{"heading":"...","body":"5-9 sentences teaching the idea from scratch with a real intuition/example"}],
  "formulas": ["formula or rule with a one-line meaning"],
  "tricks": [{"title":"short trick name","body":"how to apply it in under 30 seconds, with a mini example"}],
  "worked_examples": [{"question":"...","slow_way":"the standard method, step by step","fast_way":"the shortcut a topper uses","answer":"final answer"}],
  "common_mistakes": ["the mistake + how to avoid it"],
  "exam_insight": "3-4 sentences on how IPMAT actually asks this topic and time to spend per question",
  "practice": [{"prompt":"...","options":["a","b","c","d"],"correct_index":0,"solution":"full step-by-step","trick":"the fast way","common_mistake":"the trap in the wrong options"}]
}

Rules: 4-6 concept blocks, 4-8 formulas, 3-5 tricks, 3 worked examples ordered easy to hard, 4-6 common mistakes, exactly 6 practice questions rising in difficulty (last two at IPMAT level). Options must be plausible and only one correct.`,
  });

  const text = await result.text;
  return extractJson(text);
}

export const getLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string; regenerate?: boolean }) => input)
  .handler(async ({ data, context }) => {
    const found = findTopic(data.slug);
    if (!found) throw new Error("Unknown topic");
    const { chapter, topic } = found;

    if (!data.regenerate) {
      const { data: cached } = await context.supabase
        .from("lessons")
        .select("content")
        .eq("topic_slug", data.slug)
        .maybeSingle();
      if (cached?.content) {
        return {
          chapter: chapter.name,
          topic: topic.name,
          section: chapter.section,
          lesson: cached.content as unknown as Lesson,
        };
      }
    }

    const lesson = await generateLesson(chapter.name, topic.name, chapter.section);
    await context.supabase.from("lessons").upsert(
      {
        topic_slug: data.slug,
        section: chapter.section,
        chapter: chapter.name,
        topic: topic.name,
        content: lesson as unknown as Record<string, unknown>,
      },
      { onConflict: "topic_slug" },
    );

    return { chapter: chapter.name, topic: topic.name, section: chapter.section, lesson };
  });

export const getTopicProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("topic_progress")
      .select("topic_slug, status, practice_correct, practice_total")
      .eq("user_id", context.userId);
    return data ?? [];
  });

export const saveTopicResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string; correct: number; total: number }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const status = data.total > 0 && data.correct / data.total >= 0.7 ? "mastered" : "learning";
    const { error } = await supabase.from("topic_progress").upsert(
      {
        user_id: userId,
        topic_slug: data.slug,
        status,
        practice_correct: data.correct,
        practice_total: data.total,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,topic_slug" },
    );
    if (error) throw new Error(error.message);

    const { data: profile } = await supabase
      .from("profiles")
      .select("xp")
      .eq("id", userId)
      .maybeSingle();
    await supabase
      .from("profiles")
      .update({ xp: (profile?.xp ?? 0) + data.correct * 10 + 20 })
      .eq("id", userId);

    return { status };
  });
