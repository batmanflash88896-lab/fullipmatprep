import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { Progress } from "@/components/ui/progress";
import { QA_CHAPTERS, VARC_CHAPTERS, TOTAL_TOPICS, type Chapter } from "@/lib/syllabus";
import { getTopicProgress } from "@/lib/learn.functions";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, Circle, Search, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/learn/")({
  head: () => ({
    meta: [
      { title: "Full IPMAT syllabus — AI classroom | AscendIPM" },
      {
        name: "description",
        content:
          "Every QA and VARC topic, taught chapter by chapter by an AI teacher with concepts, shortcuts, worked examples and practice.",
      },
      { property: "og:title", content: "Full IPMAT syllabus — AI classroom" },
      {
        property: "og:description",
        content: "Learn every IPMAT topic with concept, tricks, worked examples and practice.",
      },
    ],
  }),
  component: LearnIndex,
});

function LearnIndex() {
  const { data: progress } = useQuery({
    queryKey: ["topic-progress"],
    queryFn: () => getTopicProgress(),
  });
  const [tab, setTab] = useState<"QA" | "VARC">("QA");
  const [query, setQuery] = useState("");

  const statusMap = useMemo(
    () => new Map((progress ?? []).map((p) => [p.topic_slug, p.status])),
    [progress],
  );
  const done = (progress ?? []).filter((p) => p.status === "mastered").length;

  const chapters = (tab === "QA" ? QA_CHAPTERS : VARC_CHAPTERS)
    .map((ch) => ({
      ...ch,
      topics: query
        ? ch.topics.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
        : ch.topics,
    }))
    .filter((ch) => ch.topics.length > 0);

  return (
    <AppShell>
      <section className="mb-6 overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-center gap-4">
          <Mascot size={64} mood="cheer" float />
          <div className="min-w-56 flex-1">
            <h1 className="font-display text-2xl font-extrabold">Your AI classroom</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick any topic — like Time &amp; Work — and Sunny teaches it from zero: concept,
              formulas, shortcuts, worked examples, then practice with full solutions.
            </p>
            <div className="mt-3 max-w-sm">
              <Progress value={(done / TOTAL_TOPICS) * 100} className="h-2" />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {done} of {TOTAL_TOPICS} topics mastered
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-secondary p-1">
          {(["QA", "VARC"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTab(s)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold transition-all",
                tab === s ? "bg-sunrise text-primary-foreground shadow-lift" : "text-muted-foreground",
              )}
            >
              {s === "QA" ? "Quantitative Aptitude" : "VARC"}
            </button>
          ))}
        </div>
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a topic…"
            className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="space-y-3">
        {chapters.map((ch) => (
          <ChapterCard key={ch.slug} chapter={ch} statusMap={statusMap} defaultOpen={!!query} />
        ))}
      </div>
    </AppShell>
  );
}

function ChapterCard({
  chapter,
  statusMap,
  defaultOpen,
}: {
  chapter: Chapter;
  statusMap: Map<string, string>;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || chapter.number === 1);
  const mastered = chapter.topics.filter((t) => statusMap.get(t.slug) === "mastered").length;

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sunrise font-display text-base font-extrabold text-primary-foreground">
          {chapter.number}
        </span>
        <span className="flex-1">
          <span className="block font-display text-lg font-bold">{chapter.name}</span>
          <span className="block text-xs text-muted-foreground">
            {chapter.topics.length} topics · {mastered} mastered
          </span>
        </span>
        <ChevronDown className={cn("h-5 w-5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul className="grid gap-2 border-t border-border/60 p-3 sm:grid-cols-2">
          {chapter.topics.map((topic) => {
            const status = statusMap.get(topic.slug);
            return (
              <li key={topic.slug}>
                <Link
                  to="/learn/$slug"
                  params={{ slug: topic.slug }}
                  className="flex items-center gap-2.5 rounded-2xl border border-transparent bg-background p-3 text-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-soft"
                >
                  {status === "mastered" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <Circle
                      className={cn(
                        "h-4 w-4 shrink-0",
                        status ? "text-accent" : "text-muted-foreground/50",
                      )}
                    />
                  )}
                  <span className="flex-1 font-medium">{topic.name}</span>
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
