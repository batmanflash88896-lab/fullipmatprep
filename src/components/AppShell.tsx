import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OrbitMark } from "@/components/OrbitMark";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Flame, LogOut, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard", label: "Today" },
  { to: "/plan", label: "Planner" },
  { to: "/learn", label: "Learn" },
  { to: "/mocks", label: "Mock" },
  { to: "/practice/$section", params: { section: "QA" }, label: "Practice", match: "/practice" },
  { to: "/vocabulary", label: "Vocab" },
  { to: "/doubt", label: "Ask Doubt", match: "/doubt" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile-chip"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, xp, streak")
        .eq("id", auth.user.id)
        .maybeSingle();
      return data;
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  function isActive(item: (typeof NAV)[number]) {
    const match = (item as { match?: string }).match ?? item.to;
    return match === "/practice" ? pathname.startsWith("/practice") : pathname.startsWith(match);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <OrbitMark />
            <span className="font-display text-xl font-bold tracking-tight">ascendipm.</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-6 text-sm font-medium text-foreground/75 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                params={(item as { params?: Record<string, string> }).params as never}
                className={cn(
                  "relative transition-colors hover:text-foreground",
                  isActive(item) && "font-semibold text-foreground",
                )}
              >
                {item.label}
                {isActive(item) && (
                  <span
                    aria-hidden
                    className="absolute -bottom-1.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary"
                  />
                )}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground sm:inline-flex">
              <Flame className="h-4 w-4 text-accent" />
              {profile?.streak ?? 0}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground shadow-soft">
              <Sparkles className="h-4 w-4" />
              {profile?.xp ?? 0} XP
            </span>
            <Button variant="ghost" size="icon-sm" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border/60 px-3 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              params={(item as { params?: Record<string, string> }).params as never}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground",
                isActive(item) && "bg-secondary text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6">{children}</main>
    </div>
  );
}
