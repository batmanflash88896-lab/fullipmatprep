import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { findTopic } from "@/lib/syllabus";
import { getLesson, saveTopicResult, type Lesson } from "@/lib/learn.functions";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  Rocket,
  TriangleAlert,
  XCircle,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/learn/$slug")({
  head: () => ({
    meta: [
      { title: "AI topic class — AscendIPM" },
      {
        name: "description",
        content:
          "A full AI-taught IPMAT class: concept from scratch, formulas, exam shortcuts, worked examples and practice questions.",
      },
      { property: "og:title", content: "AI topic class — AscendIPM" },
      {
        property: "og:description",
        content: "Concept, tricks, worked examples and practice for any IPMAT topic.",
      },
    ],
  }),
  component: TopicClass,
});

const STAGES = ["Concept", "Tricks", "Examples", "Practice"] as const;
type Stage = (typeof STAGES)[number];

function TopicClass() {
  const { slug } = useParams({ from: "/_authenticated/learn/$slug" });
  const meta = findTopic(slug);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["lesson", slug],
    queryFn: () => getLesson({ data: { slug } }),
    staleTime: Infinity,
    retry: false,
  });

  const [stage, setStage] = useState<Stage>("Concept");
  useEffect(() => setStage("Concept"), [slug]);

  const lesson = data?.lesson;

  return (
    <AppShell>
      <Link
        to="/learn"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All chapters
      </Link>

      <header className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          {meta?.chapter.section === "VARC" ? "VARC" : "Quantitative Aptitude"} ·{" "}
          {meta?.chapter.name}
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {meta?.topic.name ?? "Topic"}
        </h1>
      </header>

      {isLoading && <ClassLoading topic={meta?.topic.name ?? ""} />}

      {isError && (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <Mascot size={64} mood="oops" className="mx-auto" />
          <p className="mt-3 text-sm font-medium">
            Sunny couldn't build this class right now. Give it one more try.
          </p>
          <Button className="mt-4 bg-sunrise text-primary-foreground" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      {lesson && (
        <>
          <div className="mb-5 flex items-start gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-soft">
            <Mascot size={52} mood="happy" float />
            <p className="pt-1 text-sm font-medium leading-relaxed">{lesson.hook}</p>
          </div>

          <nav className="mb-5 flex flex-wrap gap-2">
            {STAGES.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-semibold transition-all",
                  stage === s
                    ? "bg-sunrise text-primary-foreground shadow-lift"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {i + 1}. {s}
              </button>
            ))}
          </nav>

          {stage === "Concept" && (
            <div className="space-y-4 animate-pop">
              {lesson.concept.map((block) => (
                <Card key={block.heading} icon={<BookOpen className="h-4 w-4" />} title={block.heading}>
                  {block.body}
                </Card>
              ))}
              {lesson.formulas?.length > 0 && (
                <div className="rounded-3xl border border-accent/40 bg-accent/10 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Formulas &amp; rules to memorise
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {lesson.formulas.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <NextButton onClick={() => setStage("Tricks")} label="Show me the shortcuts" />
            </div>
          )}

          {stage === "Tricks" && (
            <div className="space-y-4 animate-pop">
              {lesson.tricks.map((t) => (
                <Card key={t.title} icon={<Zap className="h-4 w-4" />} title={t.title} tone="accent">
                  {t.body}
                </Card>
              ))}
              <Card
                icon={<TriangleAlert className="h-4 w-4" />}
                title="Common mistakes students make"
                tone="warn"
              >
                {lesson.common_mistakes.map((m) => `• ${m}`).join("\n")}
              </Card>
              <Card icon={<Rocket className="h-4 w-4" />} title="How IPMAT asks this">
                {lesson.exam_insight}
              </Card>
              <NextButton onClick={() => setStage("Examples")} label="Watch worked examples" />
            </div>
          )}

          {stage === "Examples" && (
            <div className="space-y-4 animate-pop">
              {lesson.worked_examples.map((ex, i) => (
                <div
                  key={ex.question}
                  className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Example {i + 1}
                  </p>
                  <p className="mt-1.5 font-semibold">{ex.question}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-muted/60 p-3.5">
                      <p className="text-xs font-bold uppercase text-muted-foreground">
                        Standard method
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{ex.slow_way}</p>
                    </div>
                    <div className="rounded-2xl bg-accent/10 p-3.5">
                      <p className="text-xs font-bold uppercase text-muted-foreground">
                        Topper's shortcut
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{ex.fast_way}</p>
                    </div>
                  </div>
                  <p className="mt-3 inline-block rounded-full bg-success/15 px-3 py-1 text-sm font-bold text-success">
                    Answer: {ex.answer}
                  </p>
                </div>
              ))}
              <NextButton onClick={() => setStage("Practice")} label="Now let me try" />
            </div>
          )}

          {stage === "Practice" && (
            <PracticeRunner
              lesson={lesson}
              onDone={(correct, total) => {
                saveTopicResult({ data: { slug, correct, total } }).then(() => {
                  queryClient.invalidateQueries({ queryKey: ["topic-progress"] });
                  queryClient.invalidateQueries({ queryKey: ["profile-chip"] });
                });
              }}
            />
          )}

          <div className="mt-8 flex flex-wrap gap-3 border-t border-border/60 pt-5">
            <Button variant="outline" disabled={isFetching} onClick={() => refetch()}>
              <RefreshCw className={cn("mr-1.5 h-4 w-4", isFetching && "animate-spin")} />
              Reload class
            </Button>
            <Button asChild variant="outline">
              <Link to="/doubt">Ask Sunny a doubt on this topic</Link>
            </Button>
          </div>
        </>
      )}
    </AppShell>
  );
}

function ClassLoading({ topic }: { topic: string }) {
  const lines = useMemo(
    () => [
      `Planning the class on ${topic}…`,
      "Writing the concept from scratch…",
      "Adding shortcuts toppers use…",
      "Setting your practice questions…",
    ],
    [topic],
  );
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % lines.length), 2600);
    return () => clearInterval(t);
  }, [lines.length]);

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-10 text-center shadow-soft">
      <Mascot size={80} mood="thinking" float className="mx-auto" />
      <p className="mt-4 font-display text-lg font-bold">{lines[i]}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Sunny is preparing a full class for you — this takes a few seconds.
      </p>
    </div>
  );
}

function PracticeRunner({
  lesson,
  onDone,
}: {
  lesson: Lesson;
  onDone: (correct: number, total: number) => void;
}) {
  const questions = lesson.practice ?? [];
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);

  const q = questions[index];
  const finished = index >= questions.length;

  useEffect(() => {
    if (finished && questions.length > 0) onDone(score, questions.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  if (finished) {
    const good = score / questions.length >= 0.7;
    return (
      <div className="rounded-3xl border border-border/70 bg-card p-8 text-center shadow-soft animate-pop">
        <Mascot size={80} mood={good ? "happy" : "cheer"} float className="mx-auto" />
        <h2 className="mt-4 font-display text-2xl font-extrabold">
          {score}/{questions.length} correct
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {good
            ? "Topic marked mastered. Revisit the shortcuts once tonight and it's locked in."
            : "Not mastered yet — reread the tricks tab and retry. That's how the pattern sticks."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button
            className="bg-sunrise text-primary-foreground shadow-lift"
            onClick={() => {
              setIndex(0);
              setScore(0);
              setSelected(null);
              setChecked(false);
            }}
          >
            Retry practice
          </Button>
          <Button asChild variant="outline">
            <Link to="/learn">Next topic</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!q) return <p className="text-sm text-muted-foreground">No practice questions yet.</p>;

  const isCorrect = checked && selected === q.correct_index;

  return (
    <div className="animate-pop">
      <Progress value={(index / questions.length) * 100} className="mb-4 h-2" />
      <article className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Question {index + 1} of {questions.length}
        </p>
        <h2 className="mt-1.5 text-lg font-semibold leading-snug">{q.prompt}</h2>

        <div className="mt-4 grid gap-2.5">
          {q.options.map((option, i) => {
            const picked = selected === i;
            const answer = i === q.correct_index;
            return (
              <button
                key={option}
                type="button"
                disabled={checked}
                onClick={() => setSelected(i)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border-2 border-border bg-background p-3.5 text-left text-sm transition-all",
                  !checked && "hover:border-primary/60 hover:shadow-soft",
                  picked && !checked && "border-primary bg-primary/5",
                  checked && answer && "border-success bg-success/10",
                  checked && picked && !answer && "border-destructive bg-destructive/10",
                )}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{option}</span>
                {checked && answer && <CheckCircle2 className="h-5 w-5 text-success" />}
                {checked && picked && !answer && <XCircle className="h-5 w-5 text-destructive" />}
              </button>
            );
          })}
        </div>

        {!checked ? (
          <Button
            className="mt-5 w-full bg-sunrise text-primary-foreground shadow-lift sm:w-auto"
            disabled={selected === null}
            onClick={() => {
              setChecked(true);
              if (selected === q.correct_index) setScore((s) => s + 1);
            }}
          >
            Check answer
          </Button>
        ) : (
          <div className="mt-5 space-y-4 animate-pop">
            <div className="flex items-start gap-3 rounded-2xl bg-secondary/70 p-4">
              <Mascot size={44} mood={isCorrect ? "happy" : "oops"} />
              <p className="pt-1.5 text-sm font-medium">
                {isCorrect
                  ? "Exactly right — and you used the shortcut. That's exam pace."
                  : "Not quite. Read the solution below, then note the trap — it repeats."}
              </p>
            </div>
            <Card icon={<BookOpen className="h-4 w-4" />} title="Step-by-step solution">
              {q.solution}
            </Card>
            {q.trick && (
              <Card icon={<Lightbulb className="h-4 w-4" />} title="Shortcut" tone="accent">
                {q.trick}
              </Card>
            )}
            {q.common_mistake && (
              <Card icon={<TriangleAlert className="h-4 w-4" />} title="Common mistake" tone="warn">
                {q.common_mistake}
              </Card>
            )}
            <Button
              className="bg-sunrise text-primary-foreground shadow-lift"
              onClick={() => {
                setChecked(false);
                setSelected(null);
                setIndex((i) => i + 1);
              }}
            >
              {index + 1 === questions.length ? "See my result" : "Next question"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        )}
      </article>
    </div>
  );
}

function Card({
  title,
  children,
  icon,
  tone = "ink",
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "ink" | "accent" | "warn";
}) {
  const tones = {
    ink: "border-border/70 bg-card",
    accent: "border-accent/40 bg-accent/10",
    warn: "border-destructive/30 bg-destructive/5",
  } as const;
  return (
    <div className={cn("rounded-3xl border p-5 shadow-soft", tones[tone])}>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function NextButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button className="bg-sunrise text-primary-foreground shadow-lift" onClick={onClick}>
      {label}
      <ArrowRight className="ml-1.5 h-4 w-4" />
    </Button>
  );
}
