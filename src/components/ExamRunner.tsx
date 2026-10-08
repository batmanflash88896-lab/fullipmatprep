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
  Maximize,
  Minimize,
  UserRound,
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
        durationMin: s.durationMin,
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
        durationMin: undefined,
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
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const saved = useRef(false);
  const [accepted, setAccepted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [draftOption, setDraftOption] = useState<number | undefined>();
  const [draftText, setDraftText] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const examRef = useRef<HTMLDivElement>(null);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await examRef.current?.requestFullscreen();
    } catch { setSaveError("Full screen is unavailable in this browser."); }
  }
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const storageKey = `ipmat-exam-session:v2:${paper.id}`;

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const savedState = JSON.parse(raw) as {
          started?: boolean;
          sectionIdx?: number;
          index?: number;
          answers?: Record<string, number>;
          typed?: Record<string, string>;
          marked?: Record<string, boolean>;
          visited?: Record<string, boolean>;
          seconds?: number;
          deadline?: number;
        };
        if (savedState.started) setStarted(true);
        if (typeof savedState.sectionIdx === "number") setSectionIdx(Math.max(0, savedState.sectionIdx));
        if (typeof savedState.index === "number") setIndex(Math.max(0, savedState.index));
        if (savedState.answers) setAnswers(savedState.answers);
        if (savedState.typed) setTyped(savedState.typed);
        if (savedState.marked) setMarked(savedState.marked);
        if (savedState.visited) setVisited(savedState.visited);
        const restoredSeconds = typeof savedState.seconds === "number" ? Math.max(0, savedState.seconds) : 0;
        setSeconds(restoredSeconds);
        if (typeof savedState.deadline === "number") {
          setDeadline(savedState.deadline);
        } else if (savedState.started) {
          setDeadline(Date.now() + Math.max(0, paper.duration_min * 60 - restoredSeconds) * 1000);
        }
      }
    } catch {
      window.sessionStorage.removeItem(storageKey);
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  const group = groups[sectionIdx] ?? groups[0];
  const list = group?.questions ?? [];
  const current = list[index];

  useEffect(() => {
    if (!started || submitted) return;
    const t = setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);
      if (deadline) {
        setSeconds(
          Math.min(
            paper.duration_min * 60,
            Math.max(0, Math.floor((currentNow - (deadline - paper.duration_min * 60 * 1000)) / 1000)),
          ),
        );
      }
    }, 250);
    return () => clearInterval(t);
  }, [started, submitted, deadline, paper.duration_min]);

  useEffect(() => {
    if (!hydrated || submitted) return;
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({ started, sectionIdx, index, answers, typed, marked, visited, seconds, deadline }),
    );
  }, [hydrated, storageKey, started, sectionIdx, index, answers, typed, marked, visited, seconds, deadline, submitted]);

  useEffect(() => {
    if (current && started) {
      setVisited((v) => (v[current.id] ? v : { ...v, [current.id]: true }));
      setDraftOption(answers[current.id]);
      setDraftText(typed[current.id] ?? "");
    }
  }, [current, started]);

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
  const elapsedSeconds = deadline
    ? Math.min(paper.duration_min * 60, Math.max(0, Math.floor((Math.max(now, Date.now()) - (deadline - paper.duration_min * 60 * 1000)) / 1000)))
    : seconds;
  const left = deadline
    ? Math.max(0, Math.ceil((deadline - Math.max(now, Date.now())) / 1000))
    : Math.max(0, paper.duration_min * 60 - seconds);

  const sectionTimed = pattern.sections.length > 0 && pattern.sections.every((s) => s.durationMin);
  const sectionEndSeconds = pattern.sections.slice(0, sectionIdx + 1).reduce((sum, s) => sum + (s.durationMin ?? 0) * 60, 0);
  const sectionLeft = sectionTimed ? Math.max(0, sectionEndSeconds - elapsedSeconds) : left;

  useEffect(() => {
    if (!started || submitted || !sectionTimed) return;
    let cumulative = 0;
    const active = pattern.sections.findIndex((s) => {
      cumulative += (s.durationMin ?? 0) * 60;
      return elapsedSeconds < cumulative;
    });
    if (active >= 0 && active !== sectionIdx) {
      setSectionIdx(active);
      setIndex(0);
      setConfirming(false);
    }
  }, [elapsedSeconds, started, submitted, sectionTimed, pattern, sectionIdx]);

  function saveResponse(review: boolean) {
    if (!current) return;
    if (current.qtype === "tita") setTyped((t) => ({ ...t, [current.id]: draftText.trim() }));
    else setAnswers((a) => {
      const next = { ...a };
      if (draftOption === undefined) delete next[current.id];
      else next[current.id] = draftOption;
      return next;
    });
    setMarked((m) => ({ ...m, [current.id]: review }));
    go(index + 1);
  }

  function finish() {
    setConfirming(false);
    setSubmitted(true);
    window.sessionStorage.removeItem(storageKey);
    if (saved.current) return;
    saved.current = true;
    submitMock({ data: { paperId: paper.id, score, total: questions.length, seconds: elapsedSeconds } }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["mocks"] });
      queryClient.invalidateQueries({ queryKey: ["profile-chip"] });
    }).catch(() => {
      saved.current = false;
      setSaveError("Your result could not be saved. Retry saving without losing your result.");
    });
  }

  useEffect(() => {
    if (started && !submitted && deadline && left === 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, submitted, started, deadline]);

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
    } else if (!sectionTimed && next >= list.length && sectionIdx < groups.length - 1) {
      setSectionIdx(sectionIdx + 1);
      setIndex(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  /* ---------------- Instructions ---------------- */
  if (!started) {
    return (
      <div ref={examRef} className="cbt-shell min-h-dvh">
        <header className="cbt-header"><span>AscendIPM · Computer-based practice test</span></header>
        <main className="mx-auto max-w-4xl px-5 py-8">
          <Link to="/mocks" className="text-sm underline">Back to mocks</Link>
          <h1 className="mt-5 text-2xl font-semibold">{paper.title}</h1>
          <p className="mt-2 text-sm">{pattern.label} · {questions.length} questions · {paper.duration_min} minutes</p>
          <h2 className="cbt-band mt-7">General instructions</h2>
          <ol className="list-decimal space-y-3 py-5 pl-6 text-sm leading-relaxed">
            <li>The timer starts when you begin. The test submits automatically when time expires.</li>
            <li>{sectionTimed ? "Each section has 40 minutes. Sections open automatically in order. You cannot move to another section early or return to a completed section." : "You may move between sections while the test is running."}</li>
            <li>Choose an option or enter a short answer, then select Save & Next. Selecting an answer alone does not save it.</li>
            <li>Mark for Review & Next saves your response and flags it. Saved answers marked for review are evaluated.</li>
            <li>Clear Response removes the answer. Unanswered questions receive zero marks.</li>
            {pattern.notes.map((n) => <li key={n}>{n}</li>)}
          </ol>
          <table className="cbt-table w-full text-left text-sm">
            <thead><tr><th>Section</th><th>Questions</th><th>Time</th></tr></thead>
            <tbody>{groups.map((g) => <tr key={g.key}><td>{g.label}</td><td>{g.questions.length}</td><td>{g.durationMin ? `${g.durationMin} minutes` : "Shared timer"}</td></tr>)}</tbody>
          </table>
          <label className="mt-6 flex items-start gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />I have read and understood the instructions.</label>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled={!accepted || !hydrated} className="cbt-primary" onClick={() => {
              setDeadline(Date.now() + paper.duration_min * 60 * 1000);
              setNow(Date.now());
              setStarted(true);
            }}>Begin test</Button>
            <Button variant="outline" onClick={toggleFullscreen}><Maximize className="mr-2 h-4 w-4" />Full screen</Button>
          </div>
          {saveError && <p role="alert" className="mt-3 text-destructive">{saveError}</p>}
        </main>
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
             {score} correct · {wrongMcq + wrongTita} wrong · {pct}% accuracy on attempts · {fmt(elapsedSeconds)}
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

        {saveError && <div role="alert" className="border border-destructive p-4"><p>{saveError}</p><Button variant="outline" onClick={() => { setSaveError(null); finish(); }}>Retry saving result</Button></div>}
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
  const statusLabels: Record<Status, string> = { notVisited: "Not visited", notAnswered: "Not answered", answered: "Answered", marked: "Marked for review", answeredMarked: "Answered & marked" };
  return (
    <div ref={examRef} className="cbt-shell min-h-dvh">
      <header className="cbt-header flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-semibold">{paper.title}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm">{sectionTimed ? "Section time left" : "Time left"}</span>
          <span role="timer" className={cn("cbt-clock font-mono text-xl font-bold tabular-nums", sectionLeft < 300 && "text-destructive")}><Clock className="h-4 w-4" />{fmt(sectionLeft)}</span>
          <Button variant="ghost" size="icon" title={fullscreen ? "Exit full screen" : "Full screen"} aria-label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>{fullscreen ? <Minimize /> : <Maximize />}</Button>
        </div>
      </header>
      <div className="cbt-subheader flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{paper.exam} · Practice test</span>
        <Button variant="ghost" size="sm" onClick={() => setInstructionsOpen(true)}>View instructions</Button>
      </div>
      <div className="cbt-layout">
        <main className="flex min-w-0 flex-col">
          <nav aria-label="Exam sections" className="cbt-tabs flex overflow-x-auto">
            {groups.map((g, i) => <Button key={g.key} variant="ghost" disabled={sectionTimed && i !== sectionIdx} className={cn("cbt-tab shrink-0", i === sectionIdx && "cbt-tab-active")} onClick={() => { setSectionIdx(i); setIndex(0); }}>{g.short}{sectionTimed && i !== sectionIdx ? " · Locked" : ""}</Button>)}
          </nav>
          {current && <>
            <div className="cbt-question-bar flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Question No. {index + 1}</h2>
              <span className="text-xs">{current.qtype === "tita" ? "Short answer" : "Multiple choice"} · Correct: +{pattern.correct} · Incorrect: {current.qtype === "tita" ? pattern.negativeTita === 0 ? "0" : `−${pattern.negativeTita}` : `−${pattern.negative}`}</span>
            </div>
            <div className={cn("cbt-question-area", current.passage && "cbt-with-passage")}>
              {current.passage && <article className="cbt-passage"><h3 className="mb-4 text-sm font-semibold">Read the passage and answer the question.</h3><p className="whitespace-pre-line text-base leading-7">{pretty(current.passage)}</p></article>}
              <section className="min-w-0 p-6">
                <p className="whitespace-pre-line text-base leading-7">{pretty(current.prompt)}</p>
                {current.qtype === "tita" ? <div className="mt-7"><label htmlFor="short-answer" className="block text-sm">Enter your answer</label><input id="short-answer" inputMode="decimal" autoComplete="off" value={draftText} onChange={(e) => setDraftText(e.target.value)} className="cbt-input mt-3 w-full max-w-xs border p-3 font-mono text-lg" /></div> : <fieldset className="mt-7 space-y-5"><legend className="sr-only">Answer options</legend>{(current.options ?? []).map((opt, oi) => <label key={oi} className="flex cursor-pointer items-start gap-3 text-base leading-6"><input type="radio" name={`answer-${current.id}`} checked={draftOption === oi} onChange={() => setDraftOption(oi)} className="mt-1 h-4 w-4 shrink-0" /><span>{pretty(opt)}</span></label>)}</fieldset>}
              </section>
            </div>
            <footer className="cbt-actions flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => saveResponse(true)}>Mark for Review & Next</Button>
              <Button variant="outline" onClick={() => {
                setDraftOption(undefined); setDraftText("");
                setAnswers((a) => { const n = { ...a }; delete n[current.id]; return n; });
                setTyped((t) => { const n = { ...t }; delete n[current.id]; return n; });
                setMarked((m) => ({ ...m, [current.id]: false }));
              }}>Clear Response</Button>
              <Button className="cbt-primary sm:ml-auto" onClick={() => saveResponse(false)}>Save & Next</Button>
            </footer>
          </>}
        </main>
        <aside className="cbt-sidebar">
          <div className="cbt-candidate flex items-center gap-3"><UserRound className="h-10 w-10" /><div><p className="text-sm font-semibold">Candidate</p><p className="text-xs">{paper.exam}</p></div><Button variant="ghost" size="icon" className="ml-auto lg:hidden" aria-label="Toggle question palette" onClick={() => setPaletteOpen((v) => !v)}><Grid3X3 /></Button></div>
          <div className={cn("p-4 lg:block", !paletteOpen && "hidden")}>
            <div className="grid grid-cols-2 gap-x-2 gap-y-3">{(Object.keys(statusLabels) as Status[]).map((st) => <div key={st} className={cn("flex items-center gap-2 text-xs", st === "answeredMarked" && "col-span-2")}><span className={cn("cbt-palette-item shrink-0", `cbt-status-${st}`)}>{list.filter((q) => statusOf(q) === st).length}</span><span>{statusLabels[st]}</span></div>)}</div>
            <h2 className="cbt-band mt-5 text-sm">{group?.short}</h2>
            <p className="my-3 text-xs font-semibold">Choose a question</p>
            <div className="grid grid-cols-5 gap-3">{list.map((q, i) => <Button key={q.id} variant="ghost" aria-label={`Question ${i + 1}, ${statusLabels[statusOf(q)]}`} aria-current={index === i ? "true" : undefined} className={cn("cbt-palette-item", `cbt-status-${statusOf(q)}`, index === i && "cbt-current")} onClick={() => setIndex(i)}>{i + 1}</Button>)}</div>
          </div>
          <div className="border-t p-4"><Button className="cbt-primary w-full" onClick={() => setConfirming(true)}>Submit test</Button><p className="mt-3 text-center text-xs">Total time remaining: {fmt(left)}</p></div>
          {saveError && <p role="alert" className="p-4 text-sm text-destructive">{saveError}</p>}
        </aside>
      </div>
      {(confirming || instructionsOpen) && <div className="cbt-overlay fixed inset-0 z-50 flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label={instructionsOpen ? "Exam instructions" : "Submit test"} className="cbt-dialog max-h-[85dvh] w-full max-w-2xl overflow-auto border p-6">
        <h2 className="text-xl font-semibold">{instructionsOpen ? "Exam instructions" : "Submit test?"}</h2>
        {instructionsOpen ? <div className="my-5 space-y-3 text-sm"><p>{sectionTimed ? "40 minutes per section. Other sections stay locked until their allocated time begins." : "All sections share the overall timer."}</p>{pattern.notes.map((n) => <p key={n}>{n}</p>)}<p>Save & Next records your answer. Answered questions marked for review are evaluated. Unanswered questions carry zero marks.</p></div> : <><p className="my-4 text-sm">Your test will end. You cannot change your responses after submission.</p><table className="cbt-table my-5 w-full text-left text-sm"><thead><tr><th>Section</th><th>Answered</th><th>Unanswered</th><th>Review</th></tr></thead><tbody>{groups.map((g) => <tr key={g.key}><td>{g.short}</td><td>{g.questions.filter(attempted).length}</td><td>{g.questions.filter((q) => !attempted(q)).length}</td><td>{g.questions.filter((q) => marked[q.id]).length}</td></tr>)}</tbody></table></>}
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => { setConfirming(false); setInstructionsOpen(false); }}>{instructionsOpen ? "Close instructions" : "Return to test"}</Button>{!instructionsOpen && <Button className="cbt-primary" onClick={finish}>Confirm submission</Button>}</div>
      </div></div>}
    </div>
  );
}
