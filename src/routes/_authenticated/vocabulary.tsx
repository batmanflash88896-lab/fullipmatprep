import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getVocabDeck, setVocabStatus } from "@/lib/study.functions";
import { cn } from "@/lib/utils";
import { RotateCcw, Check, Repeat } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vocabulary")({
  head: () => ({
    meta: [
      { title: "Vocabulary builder — AscendIPM" },
      {
        name: "description",
        content: "Build IPMAT vocabulary with roots, memory hooks and example sentences on flip cards.",
      },
      { property: "og:title", content: "Vocabulary builder — AscendIPM" },
      { property: "og:description", content: "IPMAT words with roots, hooks and usage examples." },
    ],
  }),
  component: VocabPage,
});

function VocabPage() {
  const queryClient = useQueryClient();
  const { data: deck } = useQuery({ queryKey: ["vocab"], queryFn: () => getVocabDeck() });
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const mark = useMutation({
    mutationFn: (input: { wordId: string; status: "learning" | "known" }) =>
      setVocabStatus({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vocab"] }),
  });

  const words = deck ?? [];
  const card = words[index % Math.max(words.length, 1)];
  const known = words.filter((w) => w.status === "known").length;

  function advance(status: "learning" | "known") {
    if (!card) return;
    mark.mutate({ wordId: card.id as string, status });
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold">Vocabulary builder</h1>
        <p className="text-sm text-muted-foreground">
          Tap the card to flip. Meaning, root, memory hook and a real sentence — the way words
          actually stick.
        </p>
        <div className="mt-4 max-w-sm">
          <Progress value={words.length ? (known / words.length) * 100 : 0} className="h-2" />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {known} of {words.length} words marked known
          </p>
        </div>
      </div>

      {!card ? (
        <p className="text-sm text-muted-foreground">Loading your deck…</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className={cn(
              "block w-full rounded-3xl border border-border/70 bg-card p-8 text-left shadow-soft transition-all",
              flipped ? "animate-pop" : "hover:-translate-y-0.5",
            )}
          >
            {!flipped ? (
              <div className="min-h-44 text-center">
                <p className="font-display text-4xl font-extrabold tracking-tight">{card.word}</p>
                <p className="mt-2 text-sm text-muted-foreground">Tap to reveal the meaning</p>
                {card.status && (
                  <span className="mt-4 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize">
                    {card.status}
                  </span>
                )}
              </div>
            ) : (
              <div className="min-h-44 space-y-3">
                <p className="font-display text-2xl font-extrabold">{card.word}</p>
                <p className="text-base">{card.meaning}</p>
                {card.root && (
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Root:</strong> {card.root}
                  </p>
                )}
                {card.memory_hook && (
                  <p className="rounded-2xl bg-accent/10 p-3 text-sm">
                    <strong>Memory hook:</strong> {card.memory_hook}
                  </p>
                )}
                {card.example && (
                  <p className="text-sm italic text-muted-foreground">“{card.example}”</p>
                )}
              </div>
            )}
          </button>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => advance("learning")}>
              <Repeat className="mr-1.5 h-4 w-4" /> Still learning
            </Button>
            <Button
              className="bg-sunrise text-primary-foreground shadow-lift"
              onClick={() => advance("known")}
            >
              <Check className="mr-1.5 h-4 w-4" /> I know this
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setFlipped(false);
                setIndex(0);
              }}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Restart deck
            </Button>
          </div>
        </>
      )}
    </AppShell>
  );
}