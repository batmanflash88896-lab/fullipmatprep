import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { findTopic } from "@/lib/syllabus";
import { getLesson, saveTopicResult, type AskBeat, type Beat } from "@/lib/learn.functions";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  TriangleAlert,
  XCircle,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/learn/$slug")({
  head: () => ({
    meta: [
      { title: "Live AI class — AscendIPM" },
      {
        name: "description",
        content:
          "A step-by-step live class with Sunny: one small idea, then a question, then the trick — until the topic clicks.",
      },
      { property: "og:title", content: "Live AI class — AscendIPM" },
      {
        property: "og:description",
        content: "Learn any IPMAT topic one micro-step at a time with instant questions and tricks.",
      },
    ],
  }),
  component: TopicClass,
});

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

  const lesson = data?.lesson;
  const beats = useMemo(() => lesson?.beats ?? [], [lesson]);

  const [step, setStep] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [saved, setSaved] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStep(0);
    setScore({ correct: 0, total: 0 });
    setSaved(false);
  }, [slug]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [step]);

  const finished = beats.length > 0 && step >= beats.length;

  useEffect(() => {
    if (finished && !saved && score.total > 0) {
      setSaved(true);
      saveTopicResult({ data: { slug, correct: score.correct, total: score.total } }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["topic-progress"] });
        queryClient.invalidateQueries({ queryKey: ["profile-chip"] });
      });
    }
  }, [finished, saved, score, slug, queryClient]);

  return (
    <AppShell>
      <Link
        to="/learn"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All chapters
      </Link>

      <header className="mb-4">
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
            Sunny couldn't start this class right now. One more try? 🙌
          </p>
          <Button className="mt-4 bg-sunrise text-primary-foreground" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      {lesson && (
        <>
          <Progress
            value={beats.length ? (Math.min(step, beats.length) / beats.length) * 100 : 0}
            className="mb-5 h-2"
          />

          <div className="space-y-4">
            <Bubble mood="cheer">{lesson.intro}</Bubble>

            {beats.slice(0, step).map((beat, i) => (
              <DoneBeat key={i} beat={beat} />
            ))}

            {!finished && beats[step] && (
              <ActiveBeat
                key={step}
                beat={beats[step]}
                onNext={(res) => {
                  if (res) setScore((s) => ({ correct: s.correct + (res.correct ? 1 : 0), total: s.total + 1 }));
                  setStep((v) => v + 1);
                }}
              />
            )}

            {finished && (
              <div className="rounded-3xl border border-border/70 bg-card p-7 text-center shadow-soft animate-pop">
                <Mascot size={76} mood="happy" float className="mx-auto" />
                <h2 className="mt-3 font-display text-2xl font-extrabold">
                  Class done — {score.correct}/{score.total} right 🎉
                </h2>
                <p className="mx-auto mt-2 max-w-md whitespace-pre-line text-sm text-muted-foreground">
                  {lesson.wrap}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Button
                    className="bg-sunrise text-primary-foreground shadow-lift"
                    onClick={() => {
                      setStep(0);
                      setScore({ correct: 0, total: 0 });
                      setSaved(false);
                    }}
                  >
                    Redo the class
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/learn">Next topic</Link>
                  </Button>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-border/60 pt-5">
            <Button variant="outline" disabled={isFetching} onClick={() => refetch()}>
              <RefreshCw className={cn("mr-1.5 h-4 w-4", isFetching && "animate-spin")} />
              Reload class
            </Button>
            <Button asChild variant="outline">
              <Link to="/doubt">Ask Sunny a doubt 💬</Link>
            </Button>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Bubble({
  children,
  mood = "idle",
  tone = "ink",
}: {
  children: React.ReactNode;
  mood?: "idle" | "happy" | "cheer" | "thinking" | "oops";
  tone?: "ink" | "accent" | "warn";
}) {
  const tones = {
    ink: "border-border/70 bg-card",
    accent: "border-accent/40 bg-accent/10",
    warn: "border-destructive/30 bg-destructive/5",
  } as const;
  return (
    <div className="flex items-start gap-3 animate-pop">
      <Mascot size={44} mood={mood} className="shrink-0" />
      <div className={cn("rounded-3xl rounded-tl-md border p-4 shadow-soft", tones[tone])}>
        <div className="whitespace-pre-line text-[0.95rem] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function DoneBeat({ beat }: { beat: Beat }) {
  if (beat.kind === "teach") return <Bubble>{`${beat.emoji ? beat.emoji + " " : ""}${beat.text}`}</Bubble>;
  if (beat.kind === "trick")
    return (
      <Bubble mood="cheer" tone="accent">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Zap className="h-3.5 w-3.5" /> Trick · {beat.title}
        </span>
        <span className="mt-1.5 block">{beat.text}</span>
      </Bubble>
    );
  if (beat.kind === "mistake")
    return (
      <Bubble mood="oops" tone="warn">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <TriangleAlert className="h-3.5 w-3.5" /> Common mistake
        </span>
        <span className="mt-1.5 block">{beat.text}</span>
      </Bubble>
    );
  return <AskCard beat={beat} readOnly />;
}

function ActiveBeat({
  beat,
  onNext,
}: {
  beat: Beat;
  onNext: (result?: { correct: boolean }) => void;
}) {
  if (beat.kind === "ask") return <AskCard beat={beat} onNext={(c) => onNext({ correct: c })} />;

  return (
    <div className="space-y-3">
      <DoneBeat beat={beat} />
      <div className="pl-14">
        <Button className="bg-sunrise text-primary-foreground shadow-lift" onClick={() => onNext()}>
          {beat.kind === "teach" ? "Got it 👍" : "Noted 🙌"}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function AskCard({
  beat,
  onNext,
  readOnly = false,
}: {
  beat: AskBeat;
  onNext?: (correct: boolean) => void;
  readOnly?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(readOnly ? beat.correct_index : null);
  const [checked, setChecked] = useState(readOnly);
  const isCorrect = checked && selected === beat.correct_index;

  return (
    <article className="ml-0 rounded-3xl border-2 border-primary/25 bg-card p-5 shadow-soft animate-pop sm:ml-14">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Quick check ✍️</p>
      <h2 className="mt-1.5 text-base font-semibold leading-snug">{beat.prompt}</h2>

      <div className="mt-4 grid gap-2.5">
        {beat.options.map((option, i) => {
          const picked = selected === i;
          const answer = i === beat.correct_index;
          return (
            <button
              key={`${option}-${i}`}
              type="button"
              disabled={checked}
              onClick={() => setSelected(i)}
              className={cn(
                "flex items-start gap-3 rounded-2xl border-2 border-border bg-background p-3 text-left text-sm transition-all",
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

      {!checked && (
        <Button
          className="mt-4 w-full bg-sunrise text-primary-foreground shadow-lift sm:w-auto"
          disabled={selected === null}
          onClick={() => setChecked(true)}
        >
          Check my answer
        </Button>
      )}

      {checked && (
        <div className="mt-4 space-y-3 animate-pop">
          <div className="flex items-start gap-3 rounded-2xl bg-secondary/70 p-3.5">
            <Mascot size={40} mood={isCorrect ? "happy" : "oops"} />
            <p className="pt-1 text-sm font-medium">
              {readOnly
                ? "Answer shown 👇"
                : isCorrect
                  ? "Yes! 🔥 That's exactly it — exam pace."
                  : "Close one 😅 Look at the steps below, the trap repeats a lot."}
            </p>
          </div>
          <Mini title="How to solve it">{beat.solution}</Mini>
          {beat.trick && (
            <Mini title="⚡ Faster way" tone="accent">
              {beat.trick}
            </Mini>
          )}
          {beat.common_mistake && (
            <Mini title="⚠️ The trap" tone="warn">
              {beat.common_mistake}
            </Mini>
          )}
          {onNext && (
            <Button
              className="bg-sunrise text-primary-foreground shadow-lift"
              onClick={() => onNext(isCorrect)}
            >
              Continue class
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

function Mini({
  title,
  children,
  tone = "ink",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "ink" | "accent" | "warn";
}) {
  const tones = {
    ink: "border-border/70 bg-muted/50",
    accent: "border-accent/40 bg-accent/10",
    warn: "border-destructive/30 bg-destructive/5",
  } as const;
  return (
    <div className={cn("rounded-2xl border p-3.5", tones[tone])}>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function ClassLoading({ topic }: { topic: string }) {
  const lines = useMemo(
    () => [
      `Sunny is walking into class for ${topic}… 🚪`,
      "Breaking it into tiny steps… 🧩",
      "Adding the 5-second tricks… ⚡",
      "Writing your quick checks… ✍️",
    ],
    [topic],
  );
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % lines.length), 2500);
    return () => clearInterval(t);
  }, [lines.length]);

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-10 text-center shadow-soft">
      <Mascot size={80} mood="thinking" float className="mx-auto" />
      <p className="mt-4 font-display text-lg font-bold">{lines[i]}</p>
      <p className="mt-1 text-sm text-muted-foreground">Takes a few seconds — it's a full class.</p>
    </div>
  );
}