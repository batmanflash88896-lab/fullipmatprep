import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findTopic } from "@/lib/syllabus";
import type { VideoScript } from "@/lib/video.server";

export type { VideoScene, VideoCheckpoint, VideoScript } from "@/lib/video.server";

export const getVideoLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data, context }) => {
    const found = findTopic(data.slug);
    if (!found) throw new Error("Unknown topic");

    const { data: cached } = await context.supabase
      .from("video_lessons")
      .select("script, title")
      .eq("topic_slug", data.slug)
      .maybeSingle();
    if (cached?.script && (cached.script as unknown as VideoScript).scenes?.length) {
      return {
        script: cached.script as unknown as VideoScript,
        topic: found.topic.name,
        chapter: found.chapter.name,
      };
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("target_college")
      .eq("id", context.userId)
      .maybeSingle();

    const { generateVideoScript } = await import("@/lib/video.server");
    const script = await generateVideoScript(
      found.chapter.name,
      found.topic.name,
      found.chapter.section,
      profile?.target_college ?? null,
    );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("video_lessons").upsert(
      {
        topic_slug: data.slug,
        chapter_name: found.chapter.name,
        topic_name: found.topic.name,
        section: found.chapter.section,
        title: script.title ?? found.topic.name,
        script: script as unknown as never,
      },
      { onConflict: "topic_slug" },
    );

    return { script, topic: found.topic.name, chapter: found.chapter.name };
  });

/** Narrates one scene, caching the MP3 so the class replays instantly next time. */
export const getSceneAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string; index: number; narration: string }) => input)
  .handler(async ({ data }) => {
    const path = `${data.slug}/${data.index}.mp3`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const signExisting = await supabaseAdmin.storage
      .from("lesson-audio")
      .createSignedUrl(path, 60 * 60);
    if (signExisting.data?.signedUrl) return { url: signExisting.data.signedUrl };

    const { synthesizeScene } = await import("@/lib/video.server");
    const bytes = await synthesizeScene(data.narration);
    const { error } = await supabaseAdmin.storage
      .from("lesson-audio")
      .upload(path, bytes, { contentType: "audio/mpeg", upsert: true });
    if (error && !/exists/i.test(error.message)) throw new Error(error.message);

    const signed = await supabaseAdmin.storage.from("lesson-audio").createSignedUrl(path, 60 * 60);
    if (!signed.data?.signedUrl) throw new Error("Could not load the audio. Try again.");
    return { url: signed.data.signedUrl };
  });