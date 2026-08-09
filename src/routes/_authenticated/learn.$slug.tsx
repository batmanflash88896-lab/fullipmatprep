import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { findTopic } from "@/lib/syllabus";
import {
  askSunny,
  getLesson,
  saveTopicResult,
  type AskBeat,
  type Beat,
} from "@/lib/learn.functions";
import { pretty } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  Send,
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
        content:
          "Learn any IPMAT topic one micro-step at a time with instant questions and tricks.",
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
  const [paused, setPaused] = useState(false);
  const [typing, setTyping] = useState(false);
  const [doubts, setDoubts] = useState<
    { afterStep: number; question: string; answer: string | null }[]
  >([]);
  const [doubt, setDoubt] = useState("");
  const [asking, setAsking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStep(0);
    setScore({ correct: 0, total: 0 });
    setSaved(false);
    setDoubts([]);
  }, [slug]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [step, doubts, typing]);

  // Sunny keeps talking on his own — the class only stops at a question.
  const activeBeat = beats[step];
  useEffect(() => {
    if (!activeBeat || activeBeat.kind === "ask" || paused || asking) {
      setTyping(false);
      return;
    }
    const text =
      activeBeat.kind === "trick" ? activeBeat.text : ((activeBeat as { text: string }).text ?? "");
    setTyping(true);
    const show = setTimeout(() => setTyping(false), 650);
    const next = setTimeout(() => setStep((v) => v + 1), Math.min(4200, 1500 + text.length * 22));
    return () => {
      clearTimeout(show);
      clearTimeout(next);
    };
  }, [activeBeat, step, paused, asking]);

  async function sendDoubt() {
    const question = doubt.trim();
    if (!question || asking) return;
    setDoubt("");
    setAsking(true);
    const at = step;
    setDoubts((d) => [...d, { afterStep: at, question, answer: null }]);
    const context = beats
      .slice(Math.max(0, step - 6), step + 1)
      .map((b) => ("text" in b ? b.text : b.prompt))
      .join("\n");
    try {
      const res = await askSunny({ data: { slug, question, context } });
      setDoubts((d) =>
        d.map((item, i) => (i === d.length - 1 ? { ...item, answer: res.answer } : item)),
      );
    } catch {
      setDoubts((d) =>
        d.map((item, i) =>
          i === d.length - 1
            ? { ...item, answer: "Oops, I lost that one 😅 Ask me once more?" }
            : item,
        ),
      );
    } finally {
      setAsking(false);
    }
  }

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
            <Bubble mood="cheer">{pretty(lesson.intro)}</Bubble>

            {beats.slice(0, step).map((beat, i) => (
              <div key={i}>
                <DoneBeat beat={beat} />
                {doubts
                  .filter((d) => d.afterStep === i + 1)
                  .map((d, di) => (
                    <DoubtExchange key={di} question={d.question} answer={d.answer} />
                  ))}
              </div>
            ))}

            {doubts
              .filter((d) => d.afterStep === 0)
              .map((d, di) => (
                <DoubtExchange key={`d0-${di}`} question={d.question} answer={d.answer} />
              ))}

            {typing && <TypingBubble />}

            {!finished && activeBeat && activeBeat.kind === "ask" && (
              <AskCard
                key={step}
                beat={activeBeat}
                onNext={(correct) => {
                  setScore((sc) => ({
                    correct: sc.correct + (correct ? 1 : 0),
                    total: sc.total + 1,
                  }));
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
                  {pretty(lesson.wrap)}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Button asChild className="bg-aurora text-primary-foreground shadow-pop">
                    <Link to="/mocks/topic/$slug" params={{ slug }}>
                      Take the topic mock 🎯
                    </Link>
                  </Button>
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

          <div className="sticky bottom-3 z-20 mt-6">
            <div className="flex items-end gap-2 rounded-3xl border border-border/70 bg-card/95 p-2.5 shadow-lift backdrop-blur">
              {!finished && (
                <Button
                  size="icon"
                  variant="outline"
                  className="shrink-0 rounded-2xl"
                  onClick={() => setPaused((v) => !v)}
                  aria-label={paused ? "Resume class" : "Pause class"}
                >
                  {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
              )}
              <textarea
                value={doubt}
                onChange={(e) => setDoubt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendDoubt();
                  }
                }}
                rows={1}
                placeholder="Didn't get it? Ask Sunny right here 💬"
                className="max-h-28 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
              />
              <Button
                size="icon"
                className="shrink-0 rounded-2xl bg-sunrise text-primary-foreground"
                disabled={asking || !doubt.trim()}
                onClick={() => void sendDoubt()}
                aria-label="Send doubt"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              <Button size="sm" variant="ghost" disabled={isFetching} onClick={() => refetch()}>
                <RefreshCw className={cn("mr-1.5 h-4 w-4", isFetching && "animate-spin")} />
                Reload class
              </Button>
            </div>
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

function TypingBubble() {
  return (
    <div className="flex items-start gap-3 animate-pop">
      <Mascot size={44} mood="thinking" className="shrink-0" />
      <div className="flex items-center gap-1.5 rounded-3xl rounded-tl-md border border-border/70 bg-card px-4 py-4 shadow-soft">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{ animationDelay: `${i * 140}ms` }}
            className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
          />
        ))}
      </div>
    </div>
  );
}

function DoubtExchange({ question, answer }: { question: string; answer: string | null }) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-end animate-pop">
        <p className="max-w-[85%] rounded-3xl rounded-tr-md bg-primary px-4 py-3 text-sm text-primary-foreground shadow-soft">
          {question}
        </p>
      </div>
      {answer ? (
        <Bubble mood="happy" tone="accent">
          {pretty(answer)}
        </Bubble>
      ) : (
        <TypingBubble />
      )}
    </div>
  );
}

function DoneBeat({ beat }: { beat: Beat }) {
  if (beat.kind === "teach")
    return <Bubble>{`${beat.emoji ? beat.emoji + " " : ""}${pretty(beat.text)}`}</Bubble>;
  if (beat.kind === "trick")
    return (
      <Bubble mood="cheer" tone="accent">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Zap className="h-3.5 w-3.5" /> Trick · {beat.title}
        </span>
        <span className="mt-1.5 block">{pretty(beat.text)}</span>
      </Bubble>
    );
  if (beat.kind === "mistake")
    return (
      <Bubble mood="oops" tone="warn">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <TriangleAlert className="h-3.5 w-3.5" /> Common mistake
        </span>
        <span className="mt-1.5 block">{pretty(beat.text)}</span>
      </Bubble>
    );
  return <AskCard beat={beat} readOnly />;
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
      <h2 className="mt-1.5 text-base font-semibold leading-snug">{pretty(beat.prompt)}</h2>

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
              <span className="flex-1">{pretty(option)}</span>
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
          <Mini title="How to solve it">{pretty(beat.solution)}</Mini>
          {beat.trick && (
            <Mini title="⚡ Faster way" tone="accent">
              {pretty(beat.trick)}
            </Mini>
          )}
          {beat.common_mistake && (
            <Mini title="⚠️ The trap" tone="warn">
              {pretty(beat.common_mistake)}
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
