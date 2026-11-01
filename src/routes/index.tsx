import { createFileRoute, Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { OrbitMark } from "@/components/OrbitMark";
import { Button } from "@/components/ui/button";
import heroIllustration from "@/assets/hero-illustration.png";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  LineChart,
  MessageCircle,
  Sparkles,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AscendIPM — Free daily IPMAT practice & AI tutor" },
      {
        name: "description",
        content:
          "Daily IPMAT Quant and VARC questions with solutions, shortcuts and common mistakes, plus a 24x7 AI doubt solver, vocabulary builder, analytics and streaks.",
      },
      { property: "og:title", content: "AscendIPM — Free daily IPMAT practice & AI tutor" },
      {
        property: "og:description",
        content: "Daily IPMAT practice, previous-year questions and an AI tutor that shows tricks and traps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const NAV = [
  { to: "/plan", label: "Planner" },
  { to: "/learn", label: "Learn" },
  { to: "/practice/$section", params: { section: "QA" }, label: "Practice", match: "/practice" },
  { to: "/mocks", label: "Mock" },
  { to: "/dashboard", label: "Daily Practice" },
] as const;

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("eyebrow", className)}>
      <span className="eyebrow-dot" />
      {children}
    </p>
  );
}

export function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <OrbitMark />
            <span className="font-display text-xl font-bold tracking-tight">ascendipm.</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-6 text-sm font-medium text-foreground/75 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                params={(item as { params?: Record<string, string> }).params as never}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/doubt"
              className="hidden items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-soft transition-colors hover:bg-secondary sm:inline-flex"
            >
              <MessageCircle className="h-4 w-4 text-primary" />
              Ask Doubt
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-primary px-5 text-primary-foreground shadow-soft hover:bg-primary/90">
              <Link to="/auth" search={{ mode: "signup" }}>Start free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <Eyebrow>Your IPMAT, in orbit</Eyebrow>
            <h1 className="mt-4 font-display text-5xl font-bold leading-[1.04] tracking-tight sm:text-6xl">
              A big goal.
              <br />A{" "}
              <span className="relative z-0 inline-block">
                clearer
                <span aria-hidden className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded-sm bg-lime/70" />
              </span>{" "}
              next step.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              A focused space for the work ahead. Find your rhythm, choose a path, and come back to
              what matters.
            </p>
            <div className="mt-7">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-primary px-6 text-primary-foreground shadow-lift hover:bg-primary/90"
              >
                <Link to="/auth" search={{ mode: "signup" }}>
                  Find your next step <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              One step at a time. You're in the right place.
            </p>
          </div>

          <div>
            <img
              src={heroIllustration}
              alt="Student studying with AscendIPM"
              width={1024}
              height={1024}
              className="mx-auto w-full max-w-lg rounded-3xl"
            />
            <p className="mt-2 flex items-center justify-end gap-2 pr-2 text-xs text-muted-foreground">
              <span aria-hidden className="h-px w-8 bg-border" />
              A little progress, every day.
            </p>
          </div>
        </div>
      </section>

      {/* Planner band */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto_1fr_auto_1.2fr]">
            <div>
              <p className="eyebrow">
                <CalendarDays className="h-3.5 w-3.5" />
                Your starting point
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold">Planner</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Get the big picture, then make it yours.
              </p>
              <Link
                to="/plan"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Set your exam date <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div aria-hidden className="hidden h-24 w-px bg-border md:block" />

            <div>
              <p className="eyebrow">Days remaining</p>
              <p className="mt-3 font-display text-3xl font-bold tracking-widest text-foreground/80">— —</p>
              <p className="mt-1 text-xs text-muted-foreground">Add a date to see your countdown.</p>
            </div>

            <div aria-hidden className="hidden h-24 w-px bg-border md:block" />

            <div className="rounded-2xl bg-secondary p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="eyebrow text-secondary-foreground/70">
                  <Sparkles className="h-3.5 w-3.5" />
                  Preparation strategy
                </p>
                <span className="rounded-full border border-secondary-foreground/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-secondary-foreground/70">
                  Not set
                </span>
              </div>
              <p className="mt-3 text-sm text-secondary-foreground/80">
                Your strategy will shape here.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Study paths */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>Pick up where you are</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Your study paths
            </h2>
          </div>
          <p className="max-w-xs text-right text-xs text-muted-foreground">
            Different days call for different kinds of focus. Choose what feels right for today.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <PathCard
            step="01 / BUILD"
            icon={<BookOpenText className="h-5 w-5" />}
            title="Learn"
            copy="Make room for the concepts to click."
            rows={[
              { label: "QA", desc: "Quantitative Ability", to: "/learn" },
              { label: "VARC", desc: "Verbal Ability & Reading Comprehension", to: "/learn" },
            ]}
            footnote="Concepts, tricks and checkpoints."
          />
          <PathCard
            step="02 / APPLY"
            icon={<Target className="h-5 w-5" />}
            title="Practice"
            copy="Build a steady practice habit, your way."
            rows={[
              { label: "QA", desc: "Quantitative Ability", to: "/practice/$section", params: { section: "QA" } },
              { label: "VARC", desc: "Verbal Ability & Reading Comprehension", to: "/practice/$section", params: { section: "VARC" } },
            ]}
            footnote="Today's set, with instant solutions."
          />
          <MockCard />
        </div>

        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground/80">QA selected</span>
          Choose a subject to open today's practice space.
        </p>
      </section>

      {/* Daily practice */}
      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="relative overflow-hidden rounded-3xl bg-secondary p-8 shadow-soft sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr_auto]">
            <div className="relative mx-auto hidden h-40 w-40 shrink-0 sm:block" aria-hidden>
              <div className="absolute inset-0 rounded-full border border-primary/20" />
              <div className="absolute inset-0 [transform:rotate(-24deg)] rounded-[100%] border border-primary/15" />
              <div className="absolute inset-9 rounded-full bg-primary/15" />
              <Sparkles className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-primary" />
              <span className="absolute right-3 top-6 h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="absolute left-4 bottom-8 h-1.5 w-1.5 rounded-full bg-accent/70" />
            </div>

            <div>
              <p className="eyebrow text-secondary-foreground/70">A small daily ritual</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">Daily Practice</h2>
              <p className="mt-2 max-w-md text-sm text-secondary-foreground/80">
                A gentle nudge to keep your momentum. Pick a subject, and the practice space opens
                with today's set.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <PracticePill label="VARC" section="VARC" />
                <PracticePill label="QA" section="QA" />
              </div>
            </div>

            <div className="text-left lg:text-right">
              <span aria-hidden className="mb-3 hidden h-px w-12 bg-secondary-foreground/25 lg:ml-auto lg:block" />
              <p className="text-sm font-semibold text-secondary-foreground/80">
                Consistency
                <br />
                over intensity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-10 text-center text-primary-foreground shadow-pop sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "var(--gradient-glow)" }}
          />
          <div className="relative">
            <p className="eyebrow text-primary-foreground/70">
              <MessageCircle className="h-3.5 w-3.5" />
              Questions are part of the process
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Your streak starts with one question.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-primary-foreground/80">
              No coaching fees, no locked chapters. Just consistent practice and honest feedback.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-7 rounded-full bg-primary-foreground px-6 font-semibold text-primary shadow-lift hover:bg-primary-foreground/90"
            >
              <Link to="/auth" search={{ mode: "signup" }}>Create my free account</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <OrbitMark className="h-5 w-5" />
            ascendipm. · Free IPMAT preparation for every student
          </span>
          <Link to="/guest" className="font-semibold text-primary hover:underline">
            Continue as guest
          </Link>
        </div>
      </footer>
    </div>
  );
}

function PathCard({
  step,
  icon,
  title,
  copy,
  rows,
  footnote,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  copy: string;
  rows: { label: string; desc: string; to: string; params?: Record<string, string> }[];
  footnote: string;
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
          {icon}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
          {step}
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
      <div className="mt-4 space-y-1">
        {rows.map((row) => (
          <Link
            key={row.label}
            to={row.to}
            params={row.params as never}
            className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
          >
            <span className="w-10 text-xs font-bold uppercase tracking-wide">{row.label}</span>
            <span className="flex-1 text-xs text-muted-foreground">{row.desc}</span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground/70">✳ {footnote}</p>
    </div>
  );
}

function MockCard() {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
          <LineChart className="h-5 w-5" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
          03 / GET A FEEL
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl font-bold">Mock</h3>
      <p className="mt-1 text-sm text-muted-foreground">Choose a format. Your mock setup starts here.</p>
      <div className="mt-4 flex gap-2">
        <Link
          to="/mocks"
          className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold shadow-soft transition-colors hover:bg-secondary/60"
        >
          All IIMs
        </Link>
        <Link
          to="/mocks"
          className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/70"
        >
          Topic-wise
        </Link>
      </div>
      <Link
        to="/mocks"
        className="group mt-4 flex items-center gap-3 rounded-xl bg-secondary p-3.5 transition-colors hover:bg-secondary/70"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary">
          <CalendarDays className="h-4 w-4" />
        </span>
        <span className="flex-1 text-left text-xs leading-snug">
          <span className="block font-bold">All IIMs</span>
          <span className="text-secondary-foreground/70">Full-length mock catalogue</span>
        </span>
        <ArrowRight className="h-4 w-4 text-secondary-foreground/70 transition-transform group-hover:translate-x-0.5" />
      </Link>
      <p className="mt-4 text-[11px] text-muted-foreground/70">✳ Real exam pattern, full solutions.</p>
    </div>
  );
}

function PracticePill({ label, section }: { label: string; section: string }) {
  return (
    <Link
      to="/practice/$section"
      params={{ section }}
      className="group inline-flex items-center gap-2.5 rounded-full border border-border/70 bg-card py-2 pl-2.5 pr-4 text-sm font-semibold shadow-soft transition-colors hover:bg-secondary/40"
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
        {label === "QA" ? "÷" : "A"}
      </span>
      {label}
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
