import { createFileRoute, Link } from "@tanstack/react-router";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import {
  BookOpenText,
  Calculator,
  Flame,
  LineChart,
  MessagesSquare,
  Sparkles,
  Trophy,
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

const FEATURES = [
  {
    icon: Calculator,
    title: "Daily Quant set",
    body: "Five fresh questions every day across arithmetic, algebra and modern maths — with the exam shortcut for each.",
  },
  {
    icon: BookOpenText,
    title: "Daily VARC set",
    body: "Reading comprehension, para jumbles, grammar and usage, built on real IPMAT patterns.",
  },
  {
    icon: MessagesSquare,
    title: "Sunny, your AI tutor",
    body: "Ask any doubt at any hour. Get the step-by-step solution, the fastest trick and the trap to avoid.",
  },
  {
    icon: LineChart,
    title: "Performance analytics",
    body: "See exactly which topics leak your marks so revision stops being guesswork.",
  },
  {
    icon: Sparkles,
    title: "Vocabulary builder",
    body: "Flip cards with roots, synonyms and real sentences — words that actually stay in memory.",
  },
  {
    icon: Trophy,
    title: "Streaks & leaderboard",
    body: "XP for every attempt and a daily streak that makes showing up the easy part.",
  },
];

export function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Mascot size={36} mood="cheer" />
        <span className="font-display text-lg font-extrabold tracking-tight">
          Ascend<span className="text-primary">IPM</span>
        </span>
        <div className="ml-auto flex gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild className="bg-sunrise text-primary-foreground shadow-lift">
            <Link to="/auth">Start free</Link>
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 pb-16 pt-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[26rem]"
          style={{ backgroundImage: "var(--gradient-glow)" }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
            <Flame className="h-3.5 w-3.5 text-primary" /> Built by a student, for students
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Crack <span className="text-sunrise">IPMAT</span> with ten focused minutes a
            day.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Daily Quant and VARC sets built on previous-year patterns, every answer explained with
            the shortcut and the common mistake — plus an AI tutor that never gets tired of your
            doubts.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-sunrise text-primary-foreground shadow-lift">
              <Link to="/auth">Start today's set — free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">I already have an account</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/guest">Continue as guest</Link>
            </Button>
          </div>
          <div className="mt-10 flex justify-center">
            <Mascot size={110} mood="happy" float priority />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="text-center font-display text-2xl font-extrabold sm:text-3xl">
          Everything you needed and never had
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sunrise text-primary-foreground shadow-lift">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-lg font-bold">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-8 text-center shadow-soft">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "var(--gradient-glow)" }}
          />
          <div className="relative">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              Your streak starts with one question.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              No coaching fees, no locked chapters. Just consistent practice and honest feedback.
            </p>
            <Button asChild size="lg" className="mt-6 bg-sunrise text-primary-foreground shadow-lift">
              <Link to="/auth">Create my free account</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/70 py-8 text-center text-sm text-muted-foreground">
        AscendIPM · Free IPMAT preparation for every student
      </footer>
    </div>
  );
}
