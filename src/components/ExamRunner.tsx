import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/Mascot";
import { cn } from "@/lib/utils";
import { pretty } from "@/lib/format";
import { submitMock, type MockPaper, type MockQuestion } from "@/lib/mocks.functions";
import { getPattern } from "@/lib/exam-patterns";
import {
  CheckCircle2,
  Clock,
  Flag,
  Grid3X3,
  Lightbulb,
  TriangleAlert,
  XCircle,
} from "lucide-react";

type Status = "notVisited" | "notAnswered" | "answered" | "marked" | "answeredMarked";

function fmt(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "3/4", "0.75", " 12 " all compare cleanly against the setter's answer. */
function normalize(v: string) {
  const t = v.trim().replace(/\s+/g, "").replace(/,/g, "");
  if (!t) return "";
  const frac = t.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  const num = frac ? Number(frac[1]) / Number(frac[2]) : Number(t);
  if (Number.isFinite(num)) return String(Math.round(num * 1e6) / 1e6);
  return t.toLowerCase();
}

export function ExamRunner({ paper, questions }: { paper: MockPaper; questions: MockQuestion[] }) {
  const queryClient = useQueryClient();
  const pattern = useMemo(() => getPattern(paper.pattern_key), [paper.pattern_key]);

  /** Ordered exam sections (e.g. QA-MCQ → QA Short Answer → VARC) with their questions. */
  const groups = useMemo(() => {
    const built = pattern.sections
      .map((s) => ({
        key: s.key,
        label: s.label,
        short: s.short,
        questions: questions.filter((q) => q.section === s.code && q.qtype === s.qtype),
      }))
      .filter((g) => g.questions.length > 0);
    if (built.length > 0) return built;
    const order: MockQuestion["section"][] = ["QA", "LR", "VARC"];
    return order
      .map((code) => ({
        key: code,
        label:
          code === "QA" ? "Quantitative Ability" : code === "LR" ? "Logical Reasoning" : "Verbal Ability & RC",
        short: code,
        questions: questions.filter((q) => q.section === code),
      }))
      .filter((g) => g.questions.length > 0);
  }, [pattern, questions]);

  const [started, setStarted] = useState(false);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const saved = useRef(false);

  const group = groups[sectionIdx] ?? groups[0];
  const list = group?.questions ?? [];
  const current = list[index];

  useEffect(() => {
    if (!started || submitted) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [started, submitted]);

  useEffect(() => {
    if (current) setVisited((v) => (v[current.id] ? v : { ...v, [current.id]: true }));
  }, [current]);

  function attempted(q: MockQuestion) {
    return q.qtype === "tita" ? (typed[q.id] ?? "").trim().length > 0 : answers[q.id] !== undefined;
  }

  function isCorrect(q: MockQuestion) {
    if (q.qtype === "tita") {
      const t = typed[q.id];
      if (!t || !q.answer_text) return false;
      return normalize(t) === normalize(q.answer_text);
    }
    return answers[q.id] === q.correct_index;
  }

  const score = questions.filter((q) => isCorrect(q)).length;
  const wrongMcq = questions.filter((q) => q.qtype !== "tita" && attempted(q) && !isCorrect(q)).length;
  const wrongTita = questions.filter((q) => q.qtype === "tita" && attempted(q) && !isCorrect(q)).length;
  const marks = score * pattern.correct - wrongMcq * pattern.negative - wrongTita * pattern.negativeTita;
  const maxMarks = questions.length * pattern.correct;
  const left = Math.max(0, paper.duration_min * 60 - seconds);

  function finish() {
    setConfirming(false);
    setSubmitted(true);
    if (saved.current) return;
    saved.current = true;
    submitMock({ data: { paperId: paper.id, score, total: questions.length, seconds } }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["mocks"] });
      queryClient.invalidateQueries({ queryKey: ["profile-chip"] });
    });
  }

  useEffect(() => {
    if (started && !submitted && left === 0 && seconds > 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, submitted, started]);

  function statusOf(q: MockQuestion): Status {
    const a = attempted(q);
    const m = marked[q.id];
    if (a && m) return "answeredMarked";
    if (m) return "marked";
    if (a) return "answered";
    if (visited[q.id]) return "notAnswered";
    return "notVisited";
  }

  function go(next: number) {
    if (next >= 0 && next < list.length) {
      setIndex(next);
      setPaletteOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (next >= list.length && sectionIdx < groups.length - 1) {
      setSectionIdx(sectionIdx + 1);
      setIndex(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  /* ---------------- Instructions ---------------- */
  if (!started) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="overflow-hidden rounded-3xl bg-aurora p-7 text-primary-foreground shadow-pop">
          <Mascot size={64} mood="cheer" float />
          <h1 className="mt-3 font-display text-3xl font-extrabold">{paper.title}</h1>
          <p className="mt-1 text-sm opacity-90">
            {pattern.label} · real exam interface · live timer
          </p>
        </div>

        <div className="mt-5 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
          <h2 className="font-display text-xl font-extrabold">General instructions</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>• Total duration: <b className="text-foreground">{paper.duration_min} minutes</b> for {questions.length} questions.</li>
            <li>• Sections appear in exam order: {groups.map((g) => g.short).join(" → ")}. You may move between them any time.</li>
            {pattern.notes.map((n) => (
              <li key={n}>• {n}</li>
            ))}
            <li>• The question palette shows Answered, Not answered, Marked for review and Not visited.</li>
            <li>• Use <b className="text-foreground">Mark for review</b> to flag a question and come back later.</li>
            <li>• The paper submits automatically when the timer hits 00:00.</li>
            <li>• Full solutions, shortcuts and traps unlock right after you submit.</li>
          </ul>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <div key={g.key} className="rounded-2xl bg-secondary/60 p-4">
                <p className="font-display text-lg font-extrabold">{g.label}</p>
                <p className="text-sm text-muted-foreground">{g.questions.length} questions</p>
              </div>
            ))}
          </div>
          <Button
            className="mt-6 w-full bg-sunrise text-primary-foreground shadow-lift"
            size="lg"
            onClick={() => setStarted(true)}
          >
            I am ready — start the paper
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------- Result + solutions ---------------- */
  if (submitted) {
    const tried = questions.filter((q) => attempted(q)).length;
    const pct = tried ? Math.round((score / tried) * 100) : 0;
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <div className="overflow-hidden rounded-3xl bg-aurora p-7 text-center text-primary-foreground shadow-pop animate-pop">
          <Mascot size={76} mood={pct >= 60 ? "happy" : "oops"} float className="mx-auto" />
          <h2 className="mt-3 font-display text-3xl font-extrabold">
            {marks}/{maxMarks} marks
          </h2>
          <p className="mt-1 text-sm opacity-90">
            {score} correct · {wrongMcq + wrongTita} wrong · {pct}% accuracy on attempts · {fmt(seconds)}
          </p>
          <p className="mt-1 text-xs opacity-80">
            Marking: +{pattern.correct} correct, −{pattern.negative} wrong MCQ
            {pattern.negativeTita === 0 ? ", no negative on short answers" : ""}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => {
            const qs = g.questions;
            const sc = qs.filter((q) => isCorrect(q)).length;
            return (
              <div key={g.key} className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{g.label}</p>
                <p className="font-display text-2xl font-extrabold">
                  {sc}/{qs.length}
                </p>
              </div>
            );
          })}
        </div>

        <h3 className="font-display text-xl font-extrabold">Full solutions</h3>
        {questions.map((q, i) => {
          const picked = answers[q.id];
          const right = isCorrect(q);
          return (
            <div key={q.id} className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <span className={cn("rounded-full px-2 py-0.5 text-primary-foreground", right ? "bg-mint" : "bg-candy")}>
                  Q{i + 1}
                </span>
                {q.section} {q.topic ? `· ${q.topic}` : ""}
                {q.qtype === "tita" ? "· Short answer" : ""}
              </div>
              {q.passage && (
                <p className="mt-3 whitespace-pre-line rounded-2xl bg-secondary/60 p-3 text-sm leading-relaxed">
                  {pretty(q.passage)}
                </p>
              )}
              <p className="mt-3 whitespace-pre-line font-medium">{pretty(q.prompt)}</p>
              {q.qtype === "tita" ? (
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="rounded-2xl border border-success/50 bg-success/10 px-3 py-2">
                    Correct answer: <b>{pretty(q.answer_text ?? "")}</b>
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl border px-3 py-2",
                      right ? "border-success/50 bg-success/10" : "border-destructive/50 bg-destructive/10",
                    )}
                  >
                    You typed: <b>{typed[q.id]?.trim() || "—"}</b>
                  </div>
                </div>
              ) : (
              <div className="mt-3 grid gap-2">
                {(q.options ?? []).map((opt, oi) => (
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
                    {pretty(opt)}
                  </div>
                ))}
              </div>
              )}
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{pretty(q.solution)}</p>
              {q.trick && (
                <p className="mt-2 flex gap-2 rounded-2xl bg-accent/15 p-3 text-sm">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {pretty(q.trick)}
                </p>
              )}
              {q.common_mistake && (
                <p className="mt-2 flex gap-2 rounded-2xl bg-destructive/5 p-3 text-sm">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> {pretty(q.common_mistake)}
                </p>
              )}
            </div>
          );
        })}

        <div className="flex flex-wrap gap-3 pb-10">
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

  /* ---------------- Live exam ---------------- */
  const answeredCount = list.filter((q) => answers[q.id] !== undefined).length;

  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Mascot size={34} mood={left < 300 ? "oops" : "idle"} className="hidden sm:block" />
          <p className="truncate font-display text-sm font-extrabold sm:text-base">{paper.title}</p>
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold tabular-nums text-primary-foreground",
              left < 300 ? "bg-candy animate-pulse" : "bg-ocean",
            )}
          >
            <Clock className="h-4 w-4" /> {fmt(left)}
          </span>
          <Button size="sm" variant="outline" className="lg:hidden" onClick={() => setPaletteOpen((o) => !o)}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button size="sm" className="bg-sunrise text-primary-foreground" onClick={() => setConfirming(true)}>
            Submit
          </Button>
        </div>
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-2">
          {sections.map((s, i) => (
            <button
              key={s}
              onClick={() => {
                setSectionIdx(i);
                setIndex(0);
              }}
              className={cn(
                "rounded-t-xl px-4 py-2 text-sm font-bold transition-colors",
                i === sectionIdx ? "bg-aurora text-primary-foreground shadow-lift" : "bg-secondary text-muted-foreground",
              )}
            >
              {s === "QA" ? "Quantitative Ability" : "Verbal Ability & RC"}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[1fr_260px]">
        <main>
          {current && (
            <div key={current.id} className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft animate-slide-up">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  Question {index + 1} of {list.length}
                  {current.topic ? ` · ${current.topic}` : ""}
                </p>
                <button
                  onClick={() => setMarked((m) => ({ ...m, [current.id]: !m[current.id] }))}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors",
                    marked[current.id] ? "bg-accent text-primary-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Flag className="h-3.5 w-3.5" /> Mark for review
                </button>
              </div>

              {current.passage && (
                <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-line rounded-2xl bg-secondary/60 p-4 text-sm leading-relaxed">
                  {pretty(current.passage)}
                </div>
              )}

              <p className="mt-4 whitespace-pre-line text-[1.05rem] font-medium leading-relaxed">
                {pretty(current.prompt)}
              </p>

              <div className="mt-4 grid gap-2.5">
                {current.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => setAnswers((a) => ({ ...a, [current.id]: oi }))}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border-2 border-border bg-background p-3 text-left text-sm transition-all hover:border-primary/60",
                      answers[current.id] === oi && "border-primary bg-primary/10 font-semibold",
                    )}
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="flex-1">{pretty(opt)}</span>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="outline" disabled={index === 0} onClick={() => go(index - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setAnswers((a) => {
                      const next = { ...a };
                      delete next[current.id];
                      return next;
                    })
                  }
                >
                  Clear response
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMarked((m) => ({ ...m, [current.id]: true }));
                    go(index + 1);
                  }}
                >
                  Mark & next
                </Button>
                <Button className="bg-sunrise text-primary-foreground shadow-lift" onClick={() => go(index + 1)}>
                  Save & next
                </Button>
              </div>
            </div>
          )}
        </main>

        <aside
          className={cn(
            "rounded-3xl border border-border/70 bg-card p-4 shadow-soft lg:sticky lg:top-32 lg:block lg:h-fit",
            paletteOpen ? "block" : "hidden",
          )}
        >
          <p className="font-display text-sm font-extrabold">Question palette</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {answeredCount}/{list.length} answered in this section
          </p>
          <div className="mt-3 grid grid-cols-6 gap-1.5 lg:grid-cols-5">
            {list.map((q, i) => {
              const st = statusOf(q);
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setIndex(i);
                    setPaletteOpen(false);
                  }}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-transform hover:scale-105",
                    st === "answered" && "bg-success text-primary-foreground",
                    st === "answeredMarked" && "bg-accent text-primary-foreground ring-2 ring-success",
                    st === "marked" && "bg-accent text-primary-foreground",
                    st === "notAnswered" && "bg-destructive/80 text-primary-foreground",
                    st === "notVisited" && "bg-secondary text-muted-foreground",
                    i === index && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-success" /> Answered</li>
            <li className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-destructive/80" /> Not answered</li>
            <li className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-accent" /> Marked for review</li>
            <li className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-secondary" /> Not visited</li>
          </ul>
        </aside>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-pop animate-pop">
            <Mascot size={56} mood="thinking" />
            <h3 className="mt-2 font-display text-xl font-extrabold">Submit the paper?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {Object.keys(answers).length}/{questions.length} answered ·{" "}
              {questions.length - Object.keys(answers).length} left · {fmt(left)} still on the clock.
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirming(false)}>
                Keep solving
              </Button>
              <Button className="flex-1 bg-aurora text-primary-foreground shadow-pop" onClick={finish}>
                Submit now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
