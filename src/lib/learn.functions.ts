import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findTopic } from "@/lib/syllabus";

export type AskBeat = {
  kind: "ask";
  prompt: string;
  options: string[];
  correct_index: number;
  solution: string;
  trick?: string;
  common_mistake?: string;
};

export type Beat =
  | { kind: "teach"; emoji?: string; text: string }
  | { kind: "trick"; title: string; text: string }
  | { kind: "mistake"; text: string }
  | AskBeat;

export type Lesson = {
  version?: number;
  intro: string;
  beats: Beat[];
  wrap: string;
};

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
      const content = cached?.content as unknown as Lesson | null;
      if (content && Array.isArray(content.beats) && content.beats.length > 0) {
        return {
          chapter: chapter.name,
          topic: topic.name,
          section: chapter.section,
          lesson: content,
        };
      }
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("target_college")
      .eq("id", context.userId)
      .maybeSingle();
    const { generateLesson } = await import("@/lib/learn.server");
    const lesson = await generateLesson(
      chapter.name,
      topic.name,
      chapter.section,
      profile?.target_college ?? null,
    );
    await context.supabase.from("lessons").upsert(
      {
        topic_slug: data.slug,
        section: chapter.section,
        chapter: chapter.name,
        topic: topic.name,
        content: lesson as unknown as never,
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
