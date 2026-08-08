import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { getOverview } from "@/lib/study.functions";
import { Progress } from "@/components/ui/progress";
import { BookOpenText, Calculator, MessagesSquare, Trophy, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Today's plan — AscendIPM" },
      {
        name: "description",
        content: "Your daily IPMAT plan: Quant and VARC sets, accuracy analytics, streaks and the class leaderboard.",
      },
      { property: "og:title", content: "Today's plan — AscendIPM" },
      { property: "og:description", content: "Daily IPMAT practice, analytics and streaks." },
    ],
  }),
  component: Dashboard,
});

function pct(correct: number, total: number) {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: () => getOverview(),
  });

  const name = data?.profile?.full_name ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const qaDone = data?.qa.today ?? 0;
  const varcDone = data?.varc.today ?? 0;
  const dayProgress = Math.min(100, Math.round(((qaDone + varcDone) / 10) * 100));

  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-3xl bg-aurora p-6 text-primary-foreground shadow-pop">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "var(--gradient-glow)" }}
        />
        <div className="relative flex flex-wrap items-center gap-5">
          <Mascot size={72} mood={dayProgress === 100 ? "happy" : "cheer"} float />
          <div className="min-w-[220px] flex-1">
            <h1 className="text-2xl font-extrabold sm:text-3xl">
              {greeting}, {name.split(" ")[0]} 👋
            </h1>
            <p className="mt-1 text-sm opacity-90">
              {dayProgress === 100
                ? "Today's target is done. Every day like this compounds."
                : `${10 - qaDone - varcDone} questions left in today's plan. Ten a day beats ten hours on Sunday.`}
            </p>
            <div className="mt-4 max-w-md">
              <Progress value={dayProgress} className="h-2.5 bg-primary-foreground/25" />
              <p className="mt-1.5 text-xs opacity-90">
                {qaDone + varcDone}/10 questions today · {data?.profile?.streak ?? 0} day streak
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2">
        <PlanCard
          to="/practice/QA"
          icon={<Calculator className="h-5 w-5" />}
          accent="bg-sunrise"
          title="Daily Quant set"
          subtitle="5 questions · shortcuts + common mistakes"
          done={qaDone}
          accuracy={pct(data?.qa.correct ?? 0, data?.qa.total ?? 0)}
        />
        <PlanCard
          to="/practice/VARC"
          icon={<BookOpenText className="h-5 w-5" />}
          accent="bg-ocean"
          title="Daily VARC set"
          subtitle="RC, para jumbles, grammar, vocabulary"
          done={varcDone}
          accuracy={pct(data?.varc.correct ?? 0, data?.varc.total ?? 0)}
        />
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <GraduationCap className="h-5 w-5 text-primary" /> Where you're leaking marks
          </h2>
          {isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading your analytics…</p>
          ) : (data?.topics.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Attempt a few questions and your weakest topics will show up here automatically.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data!.topics.slice(0, 6).map((topic) => {
                const accuracy = pct(topic.correct, topic.total);
                return (
                  <li key={topic.topic}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{topic.topic}</span>
                      <span className="text-muted-foreground">
                        {accuracy}% · {topic.total} attempted
                      </span>
                    </div>
                    <Progress value={accuracy} className="mt-1.5 h-2" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Trophy className="h-5 w-5 text-accent" /> Leaderboard
          </h2>
          <ol className="mt-4 space-y-2">
            {(data?.leaderboard ?? []).map((row, index) => (
              <li
                key={row.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                  row.id === data?.myId ? "bg-secondary font-semibold" : ""
                }`}
              >
                <span className="w-5 text-muted-foreground">{index + 1}</span>
                <span className="flex-1 truncate">{row.full_name}</span>
                <span className="text-primary">{row.xp} XP</span>
              </li>
            ))}
            {(data?.leaderboard.length ?? 0) === 0 && (
              <li className="text-sm text-muted-foreground">Be the first on the board.</li>
            )}
          </ol>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2">
        <Link
          to="/doubt"
          className="group rounded-3xl border border-border/70 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
        >
          <MessagesSquare className="h-5 w-5 text-primary" />
          <h3 className="mt-2 text-lg font-bold">Ask Sunny, your AI tutor</h3>
          <p className="text-sm text-muted-foreground">
            Stuck at 2 a.m.? Get the step-by-step solution, the shortcut and the mistake to avoid.
          </p>
        </Link>
        <Link
          to="/vocabulary"
          className="group rounded-3xl border border-border/70 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
        >
          <BookOpenText className="h-5 w-5 text-accent" />
          <h3 className="mt-2 text-lg font-bold">Vocabulary builder</h3>
          <p className="text-sm text-muted-foreground">
            Learn words by root, not by rote. Flip, mark as known, and revise the rest.
          </p>
        </Link>
      </section>

      <section className="mt-5">
        <Link
          to="/mocks"
          className="block overflow-hidden rounded-3xl bg-candy p-6 text-primary-foreground shadow-pop transition-transform hover:-translate-y-0.5"
        >
          <h3 className="font-display text-xl font-extrabold">Mock tests & previous year papers 🎯</h3>
          <p className="mt-1 text-sm opacity-90">
            IPMAT Indore, Rohtak and JIPMAT — year by year, timed, with full solutions. Plus a topic
            mock after every class.
          </p>
        </Link>
      </section>
    </AppShell>
  );
}

function PlanCard({
  to,
  icon,
  accent,
  title,
  subtitle,
  done,
  accuracy,
}: {
  to: "/practice/QA" | "/practice/VARC";
  icon: React.ReactNode;
  accent: string;
  title: string;
  subtitle: string;
  done: number;
  accuracy: number;
}) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${accent} text-primary-foreground shadow-lift`}
      >
        {icon}
      </span>
      <h3 className="mt-3 text-lg font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-4 flex items-center gap-3 text-xs font-medium">
        <span className="rounded-full bg-secondary px-2.5 py-1">{done}/5 done today</span>
        <span className="rounded-full bg-secondary px-2.5 py-1">{accuracy}% lifetime accuracy</span>
      </div>
    </Link>
  );
}