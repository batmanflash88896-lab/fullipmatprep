import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { enrichWord, getVocabDeck, setVocabStatus } from "@/lib/study.functions";
import { cn } from "@/lib/utils";
import { Check, Repeat, Sparkles } from "lucide-react";

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

  const expand = useMutation({
    mutationFn: (wordId: string) => enrichWord({ data: { wordId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vocab"] }),
  });

  const mark = useMutation({
    mutationFn: (input: { wordId: string; status: "learning" | "known" }) =>
      setVocabStatus({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vocab"] }),
  });

  const words = deck ?? [];
  const card = words[index % Math.max(words.length, 1)];
  const known = words.filter((w) => w.status === "known").length;
  const examples = ((card?.examples as string[] | null) ?? []).filter(Boolean);
  const otherMeanings = ((card?.other_meanings as
    | { part_of_speech?: string; meaning: string; example?: string }[]
    | null) ?? []).filter((m) => m?.meaning);
  const antonyms = (card?.antonyms as string[] | null) ?? [];

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
                {card.root_hint && (
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Root:</strong> {card.root_hint}
                  </p>
                )}
                {card.synonyms?.length > 0 && (
                  <p className="rounded-2xl bg-accent/10 p-3 text-sm">
                    <strong>Synonyms:</strong> {card.synonyms.join(", ")}
                  </p>
                )}
                {examples.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Used in sentences
                    </p>
                    {examples.map((ex) => (
                      <p key={ex} className="text-sm italic text-muted-foreground">
                        “{ex}”
                      </p>
                    ))}
                  </div>
                ) : (
                  card.example && (
                    <p className="text-sm italic text-muted-foreground">“{card.example}”</p>
                  )
                )}
                {otherMeanings.length > 0 && (
                  <div className="space-y-2 rounded-2xl border border-border/70 bg-background p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Same word, other meanings
                    </p>
                    {otherMeanings.map((m) => (
                      <div key={m.meaning}>
                        <p className="text-sm font-semibold">
                          {m.part_of_speech ? `(${m.part_of_speech}) ` : ""}
                          {m.meaning}
                        </p>
                        {m.example && (
                          <p className="text-sm italic text-muted-foreground">“{m.example}”</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {antonyms.length > 0 && (
                  <p className="text-sm">
                    <strong>Antonyms:</strong> {antonyms.join(", ")}
                  </p>
                )}
              </div>
            )}
          </button>

          {!card.enriched && (
            <Button
              variant="outline"
              className="mt-4"
              disabled={expand.isPending}
              onClick={() => expand.mutate(card.id as string)}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              {expand.isPending ? "Sunny is writing…" : "Show all meanings & examples"}
            </Button>
          )}

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