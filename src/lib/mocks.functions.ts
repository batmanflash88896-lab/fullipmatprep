import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findTopic } from "@/lib/syllabus";
import { getPattern } from "@/lib/exam-patterns";
import { countMockCorrect } from "@/lib/mock-grading";

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

type MockResponses = {
  answers: Record<string, number>;
  typed: Record<string, string>;
};

function isMockResponses(value: unknown): value is MockResponses {
  if (!value || typeof value !== "object") return false;
  const responses = value as { answers?: unknown; typed?: unknown };
  if (!responses.answers || typeof responses.answers !== "object" || !responses.typed || typeof responses.typed !== "object") return false;
  return Object.values(responses.answers).every((answer) => Number.isInteger(answer) && Number(answer) >= 0 && Number(answer) < 4)
    && Object.values(responses.typed).every((answer) => typeof answer === "string" && answer.length <= 200);
}

function practiceMetadata(paper: MockPaper, number: number): MockPaper {
  if (paper.kind === "topic") return paper;
  const pattern = getPattern(paper.pattern_key);
  return {
    ...paper,
    title: `${paper.exam} — Practice Mock ${number}`,
    question_count: pattern.sections.reduce((sum, section) => sum + section.count, 0),
    duration_min: pattern.durationMin,
  };
}

/** Old caches may have extra QA MCQs; use only the required section counts. */
function completePracticeQuestions(paper: MockPaper, questions: MockQuestion[]): MockQuestion[] | null {
  const pattern = getPattern(paper.pattern_key);
  const selected = paper.kind === "topic" ? questions : pattern.sections.flatMap((section) =>
    questions.filter((q) => q.section === section.code && q.qtype === section.qtype).slice(0, section.count),
  );
  if (selected.length !== paper.question_count) return null;
  if (paper.kind !== "topic" && pattern.sections.some((section) =>
    selected.filter((q) => q.section === section.code && q.qtype === section.qtype).length !== section.count,
  )) return null;
  if (selected.some((q) => !q.prompt?.trim() || !q.solution?.trim() || (q.qtype === "tita"
    ? !q.answer_text?.trim()
    : !Array.isArray(q.options) || q.options.length !== 4 || q.options.some((option) => typeof option !== "string" || !option.trim()) || q.correct_index === null || !Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index >= 4))) return null;
  return selected.map((q, position) => ({ ...q, position }));
}

export const listMocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: papers, error: papersError }, { data: attempts, error: attemptsError }] = await Promise.all([
      supabaseAdmin
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
    if (papersError) throw new Error(`Could not load mock papers: ${papersError.message}`);
    if (attemptsError) throw new Error(`Could not load your mock history: ${attemptsError.message}`);
    const numbers = new Map<string, number>();
    return {
      papers: ((papers ?? []) as unknown as MockPaper[]).map((paper) => {
        const number = (numbers.get(paper.exam) ?? 0) + 1;
        if (paper.kind !== "topic") numbers.set(paper.exam, number);
        return practiceMetadata(paper, number);
      }),
      attempts: attempts ?? [],
    };
  });

export const getMockPaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { paperId: string }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.paperId)) throw new Error("Invalid mock paper ID");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: storedPaper, error: paperError } = await supabaseAdmin
      .from("mock_papers")
      .select("*")
      .eq("id", data.paperId)
      .maybeSingle();
    if (paperError) throw new Error(`Could not load this mock: ${paperError.message}`);
    if (!storedPaper) throw new Error("Mock not found");
    const { data: siblings, error: siblingsError } = await supabaseAdmin.from("mock_papers")
      .select("id").eq("exam", storedPaper.exam).eq("kind", storedPaper.kind)
      .order("sort_order", { ascending: false });
    if (siblingsError) throw new Error(`Could not load mock numbering: ${siblingsError.message}`);
    const paper = practiceMetadata(storedPaper as unknown as MockPaper,
      Math.max(1, (siblings ?? []).findIndex((p) => p.id === storedPaper.id) + 1));

    const { data: existing, error: questionsError } = await supabaseAdmin
      .from("mock_questions")
      .select("*")
      .eq("paper_id", data.paperId)
      .order("position");
    if (questionsError) throw new Error(`Could not load mock questions: ${questionsError.message}`);

    const cached = completePracticeQuestions(paper, (existing ?? []) as unknown as MockQuestion[]);
    if (cached) return { paper, questions: cached };

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

    const rows = generated.map((q, i) => ({
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
    const candidates = rows.map((row, i) => ({ ...row, id: `candidate-${i}` })) as unknown as MockQuestion[];
    const validated = completePracticeQuestions(paper, candidates);
    if (!validated) throw new Error("The generated paper did not pass its question-count and answer checks. Please retry.");

    const { error } = await supabaseAdmin.rpc("replace_mock_questions", {
      p_paper_id: paper.id,
      p_rows: rows as unknown as never,
    });
    if (error) throw new Error(`Could not save this paper: ${error.message}`);

    const { data: inserted, error: reloadError } = await supabaseAdmin
      .from("mock_questions")
      .select("*")
      .eq("paper_id", paper.id)
      .order("position");
    if (reloadError) throw new Error(`Could not reopen this paper: ${reloadError.message}`);
    const complete = completePracticeQuestions(paper, (inserted ?? []) as unknown as MockQuestion[]);
    if (!complete) {
      throw new Error(`The paper is incomplete (${inserted?.length ?? 0}/${paper.question_count}). Please retry.`);
    }

    return {
      paper: paper as unknown as MockPaper,
      questions: complete,
    };
  });

export const ensureTopicMock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data, context }) => {
    const found = findTopic(data.slug);
    if (!found) throw new Error("Unknown topic");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("mock_papers")
      .select("id")
      .eq("kind", "topic")
      .eq("topic_slug", data.slug)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) return { paperId: existing.id as string };

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
    if (error) {
      if (error.code === "23505") {
        const { data: raced, error: racedError } = await supabaseAdmin
          .from("mock_papers")
          .select("id")
          .eq("kind", "topic")
          .eq("topic_slug", data.slug)
          .single();
        if (!racedError && raced) return { paperId: raced.id as string };
      }
      throw new Error(error.message);
    }
    return { paperId: created.id as string };
  });

export const submitMock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string; paperId: string; responses: MockResponses; seconds: number }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.attemptId)) throw new Error("Invalid attempt ID");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.paperId)) throw new Error("Invalid mock paper ID");
    if (!isMockResponses(input.responses)) throw new Error("Invalid mock responses");
    if (!Number.isInteger(input.seconds) || input.seconds < 0 || input.seconds > 24 * 60 * 60) throw new Error("Invalid test duration");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: paper, error: paperError }, { data: storedQuestions, error: questionsError }] = await Promise.all([
      supabaseAdmin.from("mock_papers").select("id, kind, pattern_key, question_count").eq("id", data.paperId).maybeSingle(),
      supabaseAdmin.from("mock_questions").select("id, qtype, correct_index, answer_text, section").eq("paper_id", data.paperId).order("position"),
    ]);
    if (paperError) throw new Error(`Could not verify this mock: ${paperError.message}`);
    if (!paper) throw new Error("Mock not found");
    if (questionsError) throw new Error(`Could not verify your answers: ${questionsError.message}`);
    if (data.seconds > paper.duration_min * 60) throw new Error("The submitted duration exceeds this mock's time limit.");
    const pattern = getPattern(paper.pattern_key);
    const questionData = (storedQuestions ?? []) as Array<Pick<MockQuestion, "id" | "qtype" | "correct_index" | "answer_text" | "section">>;
    const expectedCount = paper.kind === "topic"
      ? paper.question_count
      : pattern.sections.reduce((sum, section) => sum + section.count, 0);
    if (questionData.length < expectedCount) throw new Error(`This mock is incomplete (${questionData.length}/${expectedCount}). Reopen it and retry.`);
    const selectedQuestions = paper.kind === "topic" ? questionData : pattern.sections.flatMap((section) =>
      questionData.filter((question) => question.section === section.code && question.qtype === section.qtype).slice(0, section.count),
    );
    if (selectedQuestions.length !== expectedCount) throw new Error("This mock's sections are incomplete. Reopen it and retry.");
    const score = countMockCorrect(selectedQuestions, data.responses);
    const { error: saveError } = await supabaseAdmin.rpc("record_mock_attempt", {
      p_attempt_id: data.attemptId,
      p_user_id: context.userId,
      p_paper_id: data.paperId,
      p_score: score,
      p_total: expectedCount,
      p_seconds: data.seconds,
    });
    if (saveError) throw new Error(`Could not save your result: ${saveError.message}`);
    return { ok: true, score, total: expectedCount };
  });
