import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getDailySet, submitAttempt } from "@/lib/study.functions";
import { cn } from "@/lib/utils";
import { CheckCircle2, Lightbulb, TriangleAlert, XCircle, Timer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/practice/$section")({
  head: () => ({
    meta: [
      { title: "Daily practice — AscendIPM" },
      {
        name: "description",
        content: "Today's IPMAT practice set with full solutions, exam shortcuts and the common mistakes to avoid.",
      },
      { property: "og:title", content: "Daily practice — AscendIPM" },
      {
        property: "og:description",
        content: "Timed IPMAT questions with solutions, tricks and common mistakes.",
      },
    ],
  }),
  component: PracticePage,
});

const ENCOURAGE = [
  "Beautiful. That's exactly the shortcut I'd use.",
  "Correct — and quick. That pace wins IPMAT.",
  "Yes! Note the pattern, it repeats every year.",
];
const CONSOLE_LINES = [
  "Almost! This one traps most students — read the trick below.",
  "Not quite, but this is a great mistake to make now instead of in the exam.",
  "Close. Fix this pattern once and you never lose it again.",
];

function PracticePage() {
  const { section: raw } = useParams({ from: "/_authenticated/practice/$section" });
  const section = raw === "VARC" ? "VARC" : "QA";
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["daily", section],
    queryFn: () => getDailySet({ data: { section } }),
  });

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef(Date.now());

  const questions = useMemo(() => data?.questions ?? [], [data]);
  const question = questions[index];
  const finished = !isLoading && questions.length > 0 && index >= questions.length;

  useEffect(() => {
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setScore(0);
  }, [section]);

  useEffect(() => {
    startedAt.current = Date.now();
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [index]);

  const mutation = useMutation({
    mutationFn: submitAttempt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["profile-chip"] });
    },
  });

  function check() {
    if (selected === null || !question) return;
    const isCorrect = selected === question.correct_index;
    setChecked(true);
    if (isCorrect) setScore((s) => s + 1);
    mutation.mutate({
      data: {
        questionId: question.id,
        section: question.section,
        topic: question.topic,
        selectedIndex: selected,
        isCorrect,
        secondsTaken: Math.round((Date.now() - startedAt.current) / 1000),
      },
    });
  }

  function next() {
    setChecked(false);
    setSelected(null);
    setIndex((i) => i + 1);
  }

  const isCorrect = checked && selected === question?.correct_index;
  const line = useMemo(
    () =>
      isCorrect
        ? ENCOURAGE[index % ENCOURAGE.length]
        : CONSOLE_LINES[index % CONSOLE_LINES.length],
    [isCorrect, index],
  );

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">
            {section === "QA" ? "Daily Quantitative Aptitude" : "Daily VARC"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Fresh set every day · full solution, shortcut and common mistake on every question
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold">
          <Timer className="h-4 w-4 text-primary" />
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
        </span>
      </div>

      {questions.length > 0 && !finished && (
        <Progress value={(index / questions.length) * 100} className="mb-5 h-2" />
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading today's set…</p>}

      {finished && (
        <div className="rounded-3xl border border-border/70 bg-card p-8 text-center shadow-soft animate-pop">
          <Mascot size={80} mood={score >= 4 ? "happy" : "cheer"} float className="mx-auto" />
          <h2 className="mt-4 text-2xl font-extrabold">
            {score}/{questions.length} correct
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {score >= 4
              ? "Outstanding. Now go read the two solutions you got right the slow way — speed is the next win."
              : "Every wrong answer here is one you won't get wrong in the exam. Log the mistake and revisit tomorrow."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-sunrise text-primary-foreground shadow-lift">
              <Link to={section === "QA" ? "/practice/VARC" : "/practice/QA"}>
                Do the {section === "QA" ? "VARC" : "Quant"} set
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard">Back to today</Link>
            </Button>
          </div>
        </div>
      )}

      {question && !finished && (
        <article className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-secondary px-2.5 py-1">{question.topic}</span>
            <span className="rounded-full bg-secondary px-2.5 py-1 capitalize">{question.difficulty}</span>
            {question.is_pyq && (
              <span className="rounded-full bg-sunrise px-2.5 py-1 text-primary-foreground">
                Previous year · {question.pyq_source}
              </span>
            )}
            <span className="ml-auto text-muted-foreground">
              Q{index + 1} of {questions.length}
            </span>
          </div>

          {question.passage && (
            <p className="mt-4 whitespace-pre-line rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed">
              {question.passage}
            </p>
          )}

          <h2 className="mt-4 text-lg font-semibold leading-snug">{question.prompt}</h2>

          <div className="mt-4 grid gap-2.5">
            {question.options.map((option, optionIndex) => {
              const isPicked = selected === optionIndex;
              const isAnswer = optionIndex === question.correct_index;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={checked}
                  onClick={() => setSelected(optionIndex)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border-2 border-border bg-background p-3.5 text-left text-sm transition-all",
                    !checked && "hover:border-primary/60 hover:shadow-soft",
                    isPicked && !checked && "border-primary bg-primary/5",
                    checked && isAnswer && "border-success bg-success/10",
                    checked && isPicked && !isAnswer && "border-destructive bg-destructive/10",
                  )}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {checked && isAnswer && <CheckCircle2 className="h-5 w-5 text-success" />}
                  {checked && isPicked && !isAnswer && <XCircle className="h-5 w-5 text-destructive" />}
                </button>
              );
            })}
          </div>

          {!checked ? (
            <Button
              className="mt-5 w-full bg-sunrise text-primary-foreground shadow-lift sm:w-auto"
              disabled={selected === null}
              onClick={check}
            >
              Check answer
            </Button>
          ) : (
            <div className="mt-5 space-y-4 animate-pop">
              <div className="flex items-start gap-3 rounded-2xl bg-secondary/70 p-4">
                <Mascot size={44} mood={isCorrect ? "happy" : "oops"} />
                <p className="pt-1.5 text-sm font-medium">{line}</p>
              </div>

              <Panel title="Step-by-step solution" tone="ink">
                {question.solution}
              </Panel>
              {question.trick && (
                <Panel title="Shortcut / trick" tone="accent" icon={<Lightbulb className="h-4 w-4" />}>
                  {question.trick}
                </Panel>
              )}
              {question.common_mistake && (
                <Panel
                  title="Common mistake"
                  tone="warn"
                  icon={<TriangleAlert className="h-4 w-4" />}
                >
                  {question.common_mistake}
                </Panel>
              )}

              <div className="flex flex-wrap gap-3">
                <Button className="bg-sunrise text-primary-foreground shadow-lift" onClick={next}>
                  {index + 1 === questions.length ? "See my result" : "Next question"}
                </Button>
                <Button asChild variant="outline">
                  <Link to="/doubt">Still confused? Ask Sunny</Link>
                </Button>
              </div>
            </div>
          )}
        </article>
      )}
    </AppShell>
  );
}

function Panel({
  title,
  children,
  tone,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  tone: "ink" | "accent" | "warn";
  icon?: React.ReactNode;
}) {
  const tones = {
    ink: "border-border bg-background",
    accent: "border-accent/40 bg-accent/10",
    warn: "border-destructive/30 bg-destructive/5",
  } as const;
  return (
    <div className={cn("rounded-2xl border p-4", tones[tone])}>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </p>
      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">{children}</p>
    </div>
  );
}