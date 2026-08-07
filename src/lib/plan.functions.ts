import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const COLLEGES = [
  {
    id: "IIM Indore",
    label: "IIM Indore",
    note: "QA (SA + MCQ) is brutal, VARC is speed-based. Heavy quant focus.",
  },
  {
    id: "IIM Rohtak",
    label: "IIM Rohtak",
    note: "QA + VARC + Logical Reasoning, all MCQ. Balanced with LR weight.",
  },
  {
    id: "IIM Bangalore",
    label: "IIM Bangalore (DBE)",
    note: "Aptitude-style paper — clean fundamentals and RC accuracy matter most.",
  },
  {
    id: "JIPMAT (Jammu / Bodh Gaya / Amritsar)",
    label: "JIPMAT — Jammu, Bodh Gaya, Amritsar",
    note: "Easier quant, more DILR and verbal. Accuracy over speed.",
  },
] as const;

export type ExamSetup = {
  target_college: string | null;
  exam_date: string | null;
  full_name: string;
};

export const getExamSetup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("target_college, exam_date, full_name")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      target_college: data?.target_college ?? null,
      exam_date: data?.exam_date ?? null,
      full_name: data?.full_name ?? "Aspirant",
    } satisfies ExamSetup;
  });

export const saveExamSetup = createServerFn({ method: "POST" })
  .inputValidator((input: { college: string; daysLeft: number }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const days = Math.max(1, Math.min(900, Math.round(data.daysLeft)));
    const date = new Date();
    date.setDate(date.getDate() + days);
    const { error } = await context.supabase
      .from("profiles")
      .update({
        target_college: data.college,
        exam_date: date.toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, exam_date: date.toISOString().slice(0, 10) };
  });