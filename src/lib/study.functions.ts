import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Question = {
  id: string;
  section: "QA" | "VARC";
  topic: string;
  difficulty: string;
  passage: string | null;
  prompt: string;
  options: string[];
  correct_index: number;
  solution: string;
  trick: string | null;
  common_mistake: string | null;
  is_pyq: boolean;
  pyq_source: string | null;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function seededOrder<T extends { id: string }>(items: T[], seed: string) {
  const score = (id: string) => {
    let h = 2166136261;
    const key = `${seed}:${id}`;
    for (let i = 0; i < key.length; i += 1) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  return [...items].sort((a, b) => score(a.id) - score(b.id));
}

export const getDailySet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { section: "QA" | "VARC" }) => input)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("questions")
      .select("*")
      .eq("section", data.section);
    if (error) throw new Error(error.message);

    const questions = (rows ?? []) as unknown as Question[];
    const ordered = seededOrder(questions, `${todayKey()}:${data.section}`);
    return { date: todayKey(), questions: ordered.slice(0, 5) };
  });

export const submitAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      questionId: string;
      section: string;
      topic: string;
      selectedIndex: number;
      isCorrect: boolean;
      secondsTaken: number;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("attempts").insert({
      user_id: userId,
      question_id: data.questionId,
      section: data.section,
      topic: data.topic,
      selected_index: data.selectedIndex,
      is_correct: data.isCorrect,
      seconds_taken: data.secondsTaken,
    });
    if (error) throw new Error(error.message);

    const { data: profile } = await supabase
      .from("profiles")
      .select("xp, streak, last_active_on")
      .eq("id", userId)
      .maybeSingle();

    const today = todayKey();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const last = profile?.last_active_on ?? null;
    const streak =
      last === today ? (profile?.streak ?? 1) : last === yesterday ? (profile?.streak ?? 0) + 1 : 1;
    const xp = (profile?.xp ?? 0) + (data.isCorrect ? 10 : 3);

    const { error: upErr } = await supabase
      .from("profiles")
      .update({ xp, streak, last_active_on: today })
      .eq("id", userId);
    if (upErr) throw new Error(upErr.message);

    return { xp, streak };
  });

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: attempts }, { data: leaders }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("attempts")
        .select("section, topic, is_correct, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(400),
      supabase
        .from("profiles")
        .select("id, full_name, xp, streak")
        .order("xp", { ascending: false })
        .limit(10),
    ]);

    const rows = attempts ?? [];
    const today = todayKey();
    const byTopic: Record<string, { topic: string; total: number; correct: number }> = {};
    for (const row of rows) {
      const bucket = (byTopic[row.topic] ??= { topic: row.topic, total: 0, correct: 0 });
      bucket.total += 1;
      if (row.is_correct) bucket.correct += 1;
    }

    const section = (name: string) => {
      const list = rows.filter((r) => r.section === name);
      return {
        total: list.length,
        correct: list.filter((r) => r.is_correct).length,
        today: list.filter((r) => (r.created_at as string).slice(0, 10) === today).length,
      };
    };

    return {
      profile: profile ?? null,
      qa: section("QA"),
      varc: section("VARC"),
      total: rows.length,
      correct: rows.filter((r) => r.is_correct).length,
      topics: Object.values(byTopic).sort((a, b) => a.correct / a.total - b.correct / b.total),
      leaderboard: leaders ?? [],
      myId: userId,
    };
  });

export const getVocabDeck = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: words }, { data: progress }] = await Promise.all([
      supabase.from("vocab_words").select("*").order("word"),
      supabase.from("vocab_progress").select("word_id, status").eq("user_id", userId),
    ]);
    const statusMap = new Map((progress ?? []).map((p) => [p.word_id, p.status]));
    return (words ?? []).map((w) => ({ ...w, status: statusMap.get(w.id) ?? null }));
  });

export const setVocabStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { wordId: string; status: "learning" | "known" }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("vocab_progress").upsert(
      {
        user_id: context.userId,
        word_id: data.wordId,
        status: data.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,word_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });