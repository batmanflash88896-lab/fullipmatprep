import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findTopic } from "@/lib/syllabus";
import { getPattern } from "@/lib/exam-patterns";

export type MockPaper = {
  id: string;
  kind: string;
  exam: string;
  year: number | null;
  title: string;
  section: string;
  topic_slug: string | null;
  topic_name: string | null;
  duration_min: number;
  question_count: number;
  pattern_key: string;
};

export type MockQuestion = {
  id: string;
  position: number;
  section: "QA" | "VARC" | "LR";
  qtype: "mcq" | "tita";
  topic: string | null;
  passage: string | null;
  prompt: string;
  options: string[] | null;
  correct_index: number | null;
  answer_text: string | null;
  solution: string;
  trick: string | null;
  common_mistake: string | null;
};

export const listMocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: papers }, { data: attempts }] = await Promise.all([
      context.supabase
        .from("mock_papers")
        .select("*")
        .order("kind")
        .order("exam")
        .order("sort_order", { ascending: false }),
      context.supabase
        .from("mock_attempts")
        .select("paper_id, score, total, seconds, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false }),
    ]);
    return {
      papers: (papers ?? []) as unknown as MockPaper[],
      attempts: attempts ?? [],
    };
  });

export const getMockPaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { paperId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: paper, error: paperError } = await context.supabase
      .from("mock_papers")
      .select("*")
      .eq("id", data.paperId)
      .maybeSingle();
    if (paperError) throw new Error(`Could not load this mock: ${paperError.message}`);
    if (!paper) throw new Error("Mock not found");

    const { data: existing, error: questionsError } = await context.supabase
      .from("mock_questions")
      .select("*")
      .eq("paper_id", data.paperId)
      .order("position");
    if (questionsError) throw new Error(`Could not load mock questions: ${questionsError.message}`);

    if (existing && existing.length === paper.question_count) {
      return { paper: paper as unknown as MockPaper, questions: existing as unknown as MockQuestion[] };
    }

    const { generatePyqPaper, generateTopicPaper } = await import("@/lib/mocks.server");
    let generated;
    if (paper.kind === "topic" && paper.topic_slug) {
      const found = findTopic(paper.topic_slug);
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("target_college")
        .eq("id", context.userId)
        .maybeSingle();
      generated = await generateTopicPaper(
        found?.chapter.name ?? "IPMAT",
        found?.topic.name ?? paper.topic_name ?? "Topic",
        (found?.chapter.section ?? "QA") as "QA" | "VARC",
        paper.question_count,
        profile?.target_college ?? null,
      );
    } else {
      generated = await generatePyqPaper(
        paper.exam,
        paper.year ?? 2024,
        getPattern(paper.pattern_key),
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (existing && existing.length > 0) {
      const { error: clearError } = await supabaseAdmin
        .from("mock_questions")
        .delete()
        .eq("paper_id", paper.id);
      if (clearError) throw new Error(`Could not repair the incomplete paper: ${clearError.message}`);
    }
    const rows = generated.map((q, i) => ({
      paper_id: paper.id,
      position: i,
      section: q.section === "VARC" ? "VARC" : q.section === "LR" ? "LR" : "QA",
      qtype: q.qtype === "tita" ? "tita" : "mcq",
      topic: q.topic ?? paper.topic_name ?? null,
      passage: q.passage ?? null,
      prompt: q.prompt,
      options: (q.qtype === "tita" ? null : q.options ?? []) as unknown as never,
      correct_index:
        q.qtype === "tita"
          ? null
          : Math.max(0, Math.min((q.options?.length ?? 1) - 1, q.correct_index ?? 0)),
      answer_text: q.qtype === "tita" ? (q.answer_text ?? "").trim() : null,
      solution: q.solution ?? "",
      trick: q.trick ?? null,
      common_mistake: q.common_mistake ?? null,
    }));
    const { data: inserted, error } = await supabaseAdmin
      .from("mock_questions")
      .insert(rows)
      .select("*");
    if (error) throw new Error(error.message);

    return {
      paper: paper as unknown as MockPaper,
      questions: (inserted ?? []) as unknown as MockQuestion[],
    };
  });

export const ensureTopicMock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data, context }) => {
    const found = findTopic(data.slug);
    if (!found) throw new Error("Unknown topic");

    const { data: existing, error: existingError } = await context.supabase
      .from("mock_papers")
      .select("id")
      .eq("kind", "topic")
      .eq("topic_slug", data.slug)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) return { paperId: existing.id as string };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin
      .from("mock_papers")
      .insert({
        kind: "topic",
        exam: "Topic mock",
        year: null,
        title: `${found.topic.name} — Topic Mock`,
        section: found.chapter.section,
        topic_slug: data.slug,
        topic_name: found.topic.name,
        duration_min: 15,
        question_count: 10,
        pattern_key: "topic",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { paperId: created.id as string };
  });

export const submitMock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { paperId: string; score: number; total: number; seconds: number }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("mock_attempts").insert({
      user_id: context.userId,
      paper_id: data.paperId,
      score: data.score,
      total: data.total,
      seconds: data.seconds,
    });
    if (error) throw new Error(error.message);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("xp")
      .eq("id", context.userId)
      .maybeSingle();
    await context.supabase
      .from("profiles")
      .update({ xp: (profile?.xp ?? 0) + data.score * 12 + 25 })
      .eq("id", context.userId);
    return { ok: true };
  });
