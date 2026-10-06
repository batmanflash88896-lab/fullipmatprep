import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ALL_CHAPTERS, TOTAL_TOPICS } from "@/lib/syllabus";
import { GUEST_QUESTIONS, readGuest, writeGuest, type GuestData } from "@/lib/guest";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

export const Route = createFileRoute("/guest")({
  head: () => ({
    meta: [
      { title: "Try AscendIPM as a guest — IPMAT practice" },
      { name: "description", content: "Try IPMAT practice questions and track syllabus progress on your device, no account needed." },
      { property: "og:title", content: "Try AscendIPM as a guest" },
      { property: "og:description", content: "Free IPMAT practice and a syllabus tracker saved on your device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuestPage,
});

function GuestPage() {
  const [data, setData] = useState<GuestData>({ topics: {}, quiz: [] });
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [section, setSection] = useState<"QA" | "VARC">("QA");

  useEffect(() => setData(readGuest()), []);

  function save(next: GuestData) {
    setData(next);
    writeGuest(next);
  }

  const q = GUEST_QUESTIONS[idx];
  const finished = idx >= GUEST_QUESTIONS.length;
  const mastered = Object.values(data.topics).filter((s) => s === "mastered").length;
  const best = data.quiz.reduce((m, r) => Math.max(m, r.correct), 0);

  function choose(i: number) {
    if (picked !== null || !q) return;
    setPicked(i);
    if (i === q.correct) setScore((s) => s + 1);
  }

  function next() {
    const n = idx + 1;
    if (n >= GUEST_QUESTIONS.length) {
      save({ ...data, quiz: [...data.quiz, { correct: score, total: GUEST_QUESTIONS.length, at: new Date().toISOString() }].slice(-20) });
    }
    setIdx(n);
    setPicked(null);
  }

  function cycle(slug: string) {
    const cur = data.topics[slug];
    const topics = { ...data.topics };
    if (!cur) topics[slug] = "learning";
    else if (cur === "learning") topics[slug] = "mastered";
    else delete topics[slug];
    save({ ...data, topics });
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pb-20 pt-6">
      <header className="flex items-center gap-3">
        <Mascot size={40} mood="cheer" priority />
        <span className="font-display text-lg font-extrabold">
          Ascend<span className="text-primary">IPM</span> <span className="text-sm font-semibold text-muted-foreground">· Guest</span>
        </span>
        <Button asChild className="ml-auto bg-sunrise text-primary-foreground shadow-lift">
          <Link to="/auth" search={{ mode: "signup" }}>Create free account</Link>
        </Button>
      </header>

      <p className="mt-5 rounded-2xl bg-secondary px-4 py-3 text-sm">
        Guest progress is saved only on this device. Sign up to unlock classes, videos, mocks and the AI tutor.
      </p>

      <section className="mt-6 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
        <h1 className="font-display text-2xl font-extrabold">Quick practice ⚡</h1>
        {finished ? (
          <div className="mt-4">
            <p className="text-lg font-bold">You scored {score}/{GUEST_QUESTIONS.length} 🎉</p>
            <p className="text-sm text-muted-foreground">Best on this device: {Math.max(best, score)}/{GUEST_QUESTIONS.length}</p>
            <Button className="mt-4" variant="outline" onClick={() => { setIdx(0); setScore(0); }}>Try again</Button>
          </div>
        ) : q ? (
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground">Question {idx + 1} of {GUEST_QUESTIONS.length}</p>
            <p className="mt-2 font-semibold">{q.prompt}</p>
            <div className="mt-3 grid gap-2">
              {q.options.map((o, i) => (
                <button
                  key={o}
                  onClick={() => choose(i)}
                  className={cn(
                    "rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm transition-colors",
                    picked !== null && i === q.correct && "border-success bg-success/15",
                    picked === i && i !== q.correct && "border-destructive bg-destructive/10",
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
            {picked !== null && (
              <div className="mt-4 space-y-2 text-sm">
                <p><strong>Solution:</strong> {q.solution}</p>
                <p><strong>Trick:</strong> {q.trick}</p>
                <Button onClick={next} className="bg-sunrise text-primary-foreground">Next</Button>
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
        <h2 className="font-display text-xl font-extrabold">Syllabus tracker</h2>
        <Progress value={(mastered / TOTAL_TOPICS) * 100} className="mt-3 h-2" />
        <p className="mt-1 text-xs text-muted-foreground">{mastered} of {TOTAL_TOPICS} topics mastered · tap a topic to mark learning → mastered</p>
        <div className="mt-4 flex gap-2">
          {(["QA", "VARC"] as const).map((s) => (
            <button key={s} onClick={() => setSection(s)} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", section === s ? "bg-sunrise text-primary-foreground" : "bg-secondary text-muted-foreground")}>{s}</button>
          ))}
        </div>
        <div className="mt-4 space-y-4">
          {ALL_CHAPTERS.filter((c) => c.section === section).map((ch) => (
            <div key={ch.slug}>
              <h3 className="font-bold">{ch.number}. {ch.name}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {ch.topics.map((t) => {
                  const st = data.topics[t.slug];
                  return (
                    <button key={t.slug} onClick={() => cycle(t.slug)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm", st === "mastered" ? "border-success bg-success/15" : st ? "border-accent bg-accent/15" : "border-border bg-background")}>
                      {st === "mastered" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Circle className="h-3.5 w-3.5" />}
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}