import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { COLLEGES, getExamSetup, saveExamSetup } from "@/lib/plan.functions";
import { buildPlan, daysUntil } from "@/lib/plan";
import { cn } from "@/lib/utils";
import { CalendarDays, Flag, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "My IPMAT study plan — AscendIPM" },
      {
        name: "description",
        content:
          "A day-by-day IPMAT plan built around your target IIM and how many days are left, weighted to the highest-scoring topics.",
      },
      { property: "og:title", content: "My IPMAT study plan — AscendIPM" },
      {
        property: "og:description",
        content: "Personalised IPMAT plan by target college and days left.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const queryClient = useQueryClient();
  const { data: setup, isLoading } = useQuery({
    queryKey: ["exam-setup"],
    queryFn: () => getExamSetup(),
  });

  const [editing, setEditing] = useState(false);
  const days = daysUntil(setup?.exam_date ?? null);
  const needsSetup = !setup?.target_college || days === null;

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading your plan…</p>
      </AppShell>
    );
  }

  if (needsSetup || editing) {
    return (
      <AppShell>
        <SetupWizard
          initialCollege={setup?.target_college ?? null}
          initialDays={days}
          onDone={() => {
            setEditing(false);
            queryClient.invalidateQueries({ queryKey: ["exam-setup"] });
          }}
        />
      </AppShell>
    );
  }

  const plan = buildPlan(days, setup.target_college);
  const college = COLLEGES.find((c) => c.id === setup.target_college);

  return (
    <AppShell>
      <section className="mb-6 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-center gap-4">
          <Mascot size={64} mood="cheer" float />
          <div className="min-w-56 flex-1">
            <h1 className="font-display text-2xl font-extrabold">
              {days} days to go, {setup.full_name.split(" ")[0]} 🔥
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Target: <span className="font-semibold text-foreground">{setup.target_college}</span> ·{" "}
              {college?.note}
            </p>
          </div>
          <Button variant="outline" onClick={() => setEditing(true)}>
            Change target
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat icon={<Flag className="h-4 w-4" />} label="Learning phase" value={`${plan.learnDays} days`} />
          <Stat icon={<CalendarDays className="h-4 w-4" />} label="Revision phase" value={`${plan.revisionDays} days`} />
          <Stat icon={<Target className="h-4 w-4" />} label="Mock phase" value={`${plan.mockDays} days`} />
        </div>
        <p className="mt-4 rounded-2xl bg-accent/10 p-3.5 text-sm">
          🎯 Daily target: <strong>{plan.dailyQuestions} questions</strong> + 1 live class + 20 vocab
          words. Miss a day, add it to the weekend — never skip two 💪
        </p>
      </section>

      <h2 className="mb-3 font-display text-xl font-extrabold">Chapter plan, weighted for you</h2>
      <div className="space-y-3">
        {plan.blocks.map((b) => (
          <div
            key={b.chapter.slug}
            className="rounded-3xl border border-border/70 bg-card p-4 shadow-soft"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-bold",
                  b.priority === "High" && "bg-primary/15 text-primary",
                  b.priority === "Medium" && "bg-accent/25 text-accent-foreground",
                  b.priority === "Steady" && "bg-secondary text-muted-foreground",
                )}
              >
                {b.priority} priority
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {b.chapter.section}
              </span>
              <h3 className="w-full font-semibold">{b.chapter.name}</h3>
            </div>
            <Progress value={b.share * 100 * 6} className="mt-2 h-1.5" />
            <p className="mt-2 text-sm text-muted-foreground">
              {b.days} days · {b.chapter.topics.length} topics ({b.topicsPerDay}/day) ·{" "}
              {b.questionsPerDay} questions/day
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {b.chapter.topics.slice(0, 3).map((t) => (
                <Button key={t.slug} asChild size="sm" variant="outline">
                  <Link to="/learn/$slug" params={{ slug: t.slug }}>
                    {t.name}
                  </Link>
                </Button>
              ))}
              <Button asChild size="sm" variant="ghost">
                <Link to="/learn">All topics →</Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/60 p-3.5">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-extrabold">{value}</p>
    </div>
  );
}

function SetupWizard({
  initialCollege,
  initialDays,
  onDone,
}: {
  initialCollege: string | null;
  initialDays: number | null;
  onDone: () => void;
}) {
  const [college, setCollege] = useState<string | null>(initialCollege);
  const [days, setDays] = useState(initialDays ? String(initialDays) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = college ? 2 : 1;

  async function save() {
    const n = Number(days);
    if (!college || !Number.isFinite(n) || n < 1) {
      setError("Tell me your target and how many days are left 🙂");
      return;
    }
    setSaving(true);
    try {
      await saveExamSetup({ data: { college, daysLeft: n } });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start gap-3">
        <Mascot size={56} mood="cheer" float />
        <div className="rounded-3xl rounded-tl-md border border-border/70 bg-card p-4 shadow-soft">
          <p className="text-[0.95rem] font-medium leading-relaxed">
            {step === 1
              ? "Hey! 👋 Before we start — which college are you aiming for? Your whole plan changes based on this."
              : `Love it — ${college} it is 🎯 Now tell me, how many days are left for your exam?`}
          </p>
        </div>
      </div>

      {step === 1 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {COLLEGES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCollege(c.id)}
              className="rounded-3xl border-2 border-border bg-card p-4 text-left transition-all hover:border-primary/60 hover:shadow-lift"
            >
              <p className="font-display text-lg font-bold">{c.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.note}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
          <label className="text-sm font-semibold" htmlFor="days">
            Days left for the exam
          </label>
          <Input
            id="days"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="e.g. 150"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="mt-2 max-w-40"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {[60, 90, 150, 240, 365].map((d) => (
              <Button key={d} type="button" size="sm" variant="outline" onClick={() => setDays(String(d))}>
                {d} days
              </Button>
            ))}
          </div>
          {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}
          <div className="mt-5 flex gap-2">
            <Button variant="ghost" onClick={() => setCollege(null)}>
              Back
            </Button>
            <Button
              className="bg-sunrise text-primary-foreground shadow-lift"
              disabled={saving}
              onClick={save}
            >
              {saving ? "Building your plan…" : "Build my plan 🚀"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}