import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mascot } from "@/components/Mascot";
import { cn } from "@/lib/utils";
import { submitMock, type MockPaper, type MockQuestion } from "@/lib/mocks.functions";
import { CheckCircle2, Clock, Lightbulb, TriangleAlert, XCircle } from "lucide-react";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MockRunner({
  paper,
  questions,
}: {
  paper: MockPaper;
  questions: MockQuestion[];
}) {
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const saved = useRef(false);

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const score = useMemo(
    () => questions.filter((q) => answers[q.id] === q.correct_index).length,
    [questions, answers],
  );

  const left = Math.max(0, paper.duration_min * 60 - seconds);

  function finish() {
    setSubmitted(true);
    if (saved.current) return;
    saved.current = true;
    submitMock({
      data: { paperId: paper.id, score, total: questions.length, seconds },
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["mocks"] });
      queryClient.invalidateQueries({ queryKey: ["profile-chip"] });
    });
  }

  useEffect(() => {
    if (!submitted && left === 0 && seconds > 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, submitted]);

  if (submitted) {
    const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="space-y-5">
        <div className="overflow-hidden rounded-3xl bg-aurora p-7 text-center text-primary-foreground shadow-pop">
          <Mascot size={76} mood={pct >= 60 ? "happy" : "oops"} float className="mx-auto" />
          <h2 className="mt-3 font-display text-3xl font-extrabold">
            {score}/{questions.length} · {pct}%
          </h2>
          <p className="mt-1 text-sm opacity-90">
            Finished in {fmt(seconds)} · {paper.title}
          </p>
        </div>

        <h3 className="font-display text-xl font-extrabold">Full solutions</h3>
        {questions.map((q, i) => {
          const picked = answers[q.id];
          const right = picked === q.correct_index;
          return (
            <div key={q.id} className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-primary-foreground",
                    right ? "bg-mint" : "bg-candy",
                  )}
                >
                  Q{i + 1}
                </span>
                {q.section} {q.topic ? `· ${q.topic}` : ""}
              </div>
              {q.passage && (
                <p className="mt-3 whitespace-pre-line rounded-2xl bg-secondary/60 p-3 text-sm leading-relaxed">
                  {q.passage}
                </p>
              )}
              <p className="mt-3 whitespace-pre-line font-medium">{q.prompt}</p>
              <div className="mt-3 grid gap-2">
                {q.options.map((opt, oi) => (
                  <div
                    key={oi}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                      oi === q.correct_index && "border-success/50 bg-success/10",
                      oi === picked && oi !== q.correct_index && "border-destructive/50 bg-destructive/10",
                    )}
                  >
                    {oi === q.correct_index ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : oi === picked ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <span className="h-4 w-4" />
                    )}
                    {opt}
                  </div>
                ))}
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{q.solution}</p>
              {q.trick && (
                <p className="mt-2 flex gap-2 rounded-2xl bg-accent/15 p-3 text-sm">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {q.trick}
                </p>
              )}
              {q.common_mistake && (
                <p className="mt-2 flex gap-2 rounded-2xl bg-destructive/5 p-3 text-sm">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> {q.common_mistake}
                </p>
              )}
            </div>
          );
        })}

        <div className="flex flex-wrap gap-3">
          <Button asChild className="bg-sunrise text-primary-foreground shadow-lift">
            <Link to="/mocks">Back to mocks</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/doubt">Ask Sunny about a question 💬</Link>
          </Button>
        </div>
      </div>
    );
  }

  const q = questions[index]!;
  const answered = Object.keys(answers).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-soft">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-primary-foreground",
            left < 120 ? "bg-candy" : "bg-ocean",
          )}
        >
          <Clock className="h-4 w-4" /> {fmt(left)}
        </span>
        <span className="text-sm font-semibold text-muted-foreground">
          {answered}/{questions.length} answered
        </span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={finish}>
          Submit
        </Button>
      </div>

      <Progress value={((index + 1) / questions.length) * 100} className="h-2" />

      <div className="flex flex-wrap gap-1.5">
        {questions.map((item, i) => (
          <button
            key={item.id}
            onClick={() => setIndex(i)}
            className={cn(
              "h-8 w-8 rounded-xl text-xs font-bold transition-colors",
              i === index
                ? "bg-aurora text-primary-foreground"
                : answers[item.id] !== undefined
                  ? "bg-success/20 text-foreground"
                  : "bg-secondary text-muted-foreground",
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft animate-pop">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          Q{index + 1} · {q.section}
          {q.topic ? ` · ${q.topic}` : ""}
        </p>
        {q.passage && (
          <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-line rounded-2xl bg-secondary/60 p-3 text-sm leading-relaxed">
            {q.passage}
          </p>
        )}
        <p className="mt-3 whitespace-pre-line text-[1.05rem] font-medium leading-relaxed">{q.prompt}</p>
        <div className="mt-4 grid gap-2">
          {q.options.map((opt, oi) => (
            <button
              key={oi}
              onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left text-sm transition-all hover:border-primary/60 hover:bg-secondary",
                answers[q.id] === oi && "border-primary bg-primary/10 font-semibold",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="mt-5 flex gap-3">
          <Button
            variant="outline"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            Previous
          </Button>
          {index < questions.length - 1 ? (
            <Button
              className="bg-sunrise text-primary-foreground shadow-lift"
              onClick={() => setIndex((i) => i + 1)}
            >
              Next
            </Button>
          ) : (
            <Button className="bg-aurora text-primary-foreground shadow-pop" onClick={finish}>
              Submit paper
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
