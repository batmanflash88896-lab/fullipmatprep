import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { listMocks } from "@/lib/mocks.functions";
import { ALL_CHAPTERS } from "@/lib/syllabus";
import { cn } from "@/lib/utils";
import { Clock, FileText, Sparkles, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mocks/")({
  head: () => ({
    meta: [
      { title: "IPMAT Mock Tests & Previous Year Papers — AscendIPM" },
      {
        name: "description",
        content:
          "Attempt IPMAT Indore, Rohtak and JIPMAT previous year papers year by year, plus topic-wise mocks with full solutions, tricks and common mistakes.",
      },
      { property: "og:title", content: "IPMAT Mock Tests & Previous Year Papers" },
      {
        property: "og:description",
        content:
          "Year-wise IPMAT papers and topic mocks with timed practice and instant solutions.",
      },
    ],
  }),
  component: MocksPage,
});

const EXAM_STYLE: Record<string, string> = {
  "IPMAT Indore": "bg-sunrise",
  "IPMAT Rohtak": "bg-aurora",
  JIPMAT: "bg-ocean",
};

function MocksPage() {
  const { data, isLoading } = useQuery({ queryKey: ["mocks"], queryFn: () => listMocks() });
  const papers = data?.papers ?? [];
  const exams = useMemo(
    () => Array.from(new Set(papers.filter((p) => p.kind === "pyq").map((p) => p.exam))),
    [papers],
  );
  const [exam, setExam] = useState<string | null>(null);
  const [topicSection, setTopicSection] = useState<"QA" | "VARC">("QA");
  const activeExam = exam ?? exams[0] ?? null;

  const best = useMemo(() => {
    const map: Record<string, { score: number; total: number }> = {};
    for (const a of data?.attempts ?? []) {
      const prev = map[a.paper_id];
      if (!prev || a.score > prev.score) map[a.paper_id] = { score: a.score, total: a.total };
    }
    return map;
  }, [data]);

  const yearPapers = papers.filter((p) => p.kind === "pyq" && p.exam === activeExam);
  const topicPapers = papers.filter((p) => p.kind === "topic");

  return (
    <AppShell>
      <div className="overflow-hidden rounded-3xl bg-aurora p-6 text-primary-foreground shadow-pop">
        <div className="flex items-center gap-4">
          <Mascot size={62} mood="cheer" float />
          <div>
            <h1 className="font-display text-3xl font-extrabold">Mock tests 🎯</h1>
            <p className="mt-1 text-sm opacity-90">
              Every IPMAT year paper, exam-accurate and timed — plus a topic mock after each class.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-7">
        <h2 className="font-display text-xl font-extrabold">Previous year papers</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {exams.map((e) => (
            <button
              key={e}
              onClick={() => setExam(e)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold transition-all",
                e === activeExam
                  ? cn(EXAM_STYLE[e] ?? "bg-sunrise", "text-primary-foreground shadow-lift")
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {e}
            </button>
          ))}
        </div>

        {isLoading && <p className="mt-5 text-sm text-muted-foreground">Loading papers…</p>}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {yearPapers.map((p, pi) => (
            <Reveal key={p.id} delay={pi * 35} className="h-full">
              <Link
                to="/mocks/$paperId"
                params={{ paperId: p.id }}
                className="group block h-full rounded-3xl border border-border/70 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-extrabold text-primary-foreground",
                      EXAM_STYLE[p.exam] ?? "bg-sunrise",
                    )}
                  >
                    {p.year}
                  </span>
                  {best[p.id] && (
                    <span className="text-xs font-bold text-success">
                      Best {best[p.id]!.score}/{best[p.id]!.total}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-display text-lg font-extrabold">
                  {p.exam} {p.year}
                </h3>
                <p className="text-xs font-semibold text-muted-foreground">
                  Full length · QA + VARC
                </p>
                <p className="mt-1 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> {p.question_count} Qs
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {p.duration_min} min
                  </span>
                </p>
                <p className="mt-3 text-sm font-semibold text-primary group-hover:underline">
                  Start paper →
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-extrabold">Topic-wise tests</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every single QA and VARC topic has its own timed 10-question test with solutions.
            </p>
          </div>
          <div className="flex gap-2">
            {(["QA", "VARC"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setTopicSection(s)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-bold transition-all",
                  topicSection === s
                    ? "bg-mint text-primary-foreground shadow-lift"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "QA" ? "Quantitative" : "Verbal & RC"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {ALL_CHAPTERS.filter((ch) => ch.section === topicSection).map((ch, ci) => (
            <Reveal key={ch.slug} delay={ci * 40}>
              <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-aurora text-sm font-extrabold text-primary-foreground">
                    {ch.number}
                  </span>
                  <h3 className="font-display text-lg font-extrabold">{ch.name}</h3>
                  <span className="ml-auto text-xs font-semibold text-muted-foreground">
                    {ch.topics.length} tests
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ch.topics.map((t) => {
                    const existing = topicPapers.find((p) => p.topic_slug === t.slug);
                    const b = existing ? best[existing.id] : undefined;
                    return (
                      <Link
                        key={t.slug}
                        to="/mocks/topic/$slug"
                        params={{ slug: t.slug }}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-soft"
                      >
                        <Target className="h-3.5 w-3.5 text-primary" />
                        {t.name}
                        {b && (
                          <span className="rounded-full bg-success/15 px-2 text-xs font-bold text-success">
                            {b.score}/{b.total}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
                <Button asChild size="sm" variant="ghost" className="mt-3 px-0 text-primary">
                  <Link to="/learn">
                    <Sparkles className="mr-1 h-3.5 w-3.5" /> Learn this chapter first
                  </Link>
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
