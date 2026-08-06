import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { createThread, deleteThread, listThreads } from "@/lib/doubt.functions";
import { MessageSquarePlus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/doubt/")({
  head: () => ({
    meta: [
      { title: "AI doubt solver — AscendIPM" },
      {
        name: "description",
        content: "Ask Sunny, the AscendIPM AI tutor, any IPMAT doubt and get the solution, the shortcut and the common mistake.",
      },
      { property: "og:title", content: "AI doubt solver — AscendIPM" },
      { property: "og:description", content: "24x7 AI tutor for IPMAT Quant and VARC doubts." },
    ],
  }),
  component: DoubtIndex,
});

const STARTERS = [
  "Explain percentage change vs percentage point with an IPMAT example",
  "How do I attack para-jumbles in under 60 seconds?",
  "Teach me the AM-GM inequality shortcut",
  "Give me a 30-day plan to fix my Quant accuracy",
];

function DoubtIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: threads } = useQuery({ queryKey: ["threads"], queryFn: () => listThreads() });

  const create = useMutation({
    mutationFn: (title?: string) => createThread({ data: { title } }),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/doubt/$threadId", params: { threadId: id } });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteThread({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["threads"] }),
  });

  return (
    <AppShell>
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "var(--gradient-glow)" }}
        />
        <div className="relative flex flex-wrap items-center gap-5">
          <Mascot size={72} mood="cheer" float />
          <div className="min-w-[220px] flex-1">
            <h1 className="text-2xl font-extrabold">Ask Sunny anything</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every answer comes with a step-by-step solution, an exam shortcut and the mistake most
              students make.
            </p>
          </div>
          <Button
            className="bg-sunrise text-primary-foreground shadow-lift"
            onClick={() => create.mutate(undefined)}
            disabled={create.isPending}
          >
            <MessageSquarePlus className="mr-1.5 h-4 w-4" /> New doubt
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {STARTERS.map((starter) => (
          <button
            key={starter}
            type="button"
            onClick={() => create.mutate(starter)}
            className="rounded-2xl border border-border bg-card p-4 text-left text-sm font-medium shadow-soft transition-transform hover:-translate-y-0.5 hover:border-primary/50"
          >
            {starter}
          </button>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold">Your conversations</h2>
      <ul className="mt-3 space-y-2">
        {(threads ?? []).map((thread) => (
          <li
            key={thread.id}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft"
          >
            <button
              type="button"
              className="flex-1 truncate text-left text-sm font-medium"
              onClick={() => navigate({ to: "/doubt/$threadId", params: { threadId: thread.id } })}
            >
              {thread.title}
            </button>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {new Date(thread.updated_at as string).toLocaleDateString()}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete conversation"
              onClick={() => remove.mutate(thread.id as string)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
        {(threads?.length ?? 0) === 0 && (
          <li className="text-sm text-muted-foreground">
            No doubts yet — start one above and Sunny will walk you through it.
          </li>
        )}
      </ul>
    </AppShell>
  );
}