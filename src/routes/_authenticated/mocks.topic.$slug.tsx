import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { ensureTopicMock } from "@/lib/mocks.functions";

export const Route = createFileRoute("/_authenticated/mocks/topic/$slug")({
  head: () => ({
    meta: [
      { title: "Topic mock — AscendIPM" },
      {
        name: "description",
        content: "A 10-question topic mock built right after your class, with solutions and shortcuts.",
      },
      { property: "og:title", content: "Topic mock — AscendIPM" },
      { property: "og:description", content: "Test one topic with a timed 10-question mock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TopicMockRedirect,
});

function TopicMockRedirect() {
  const { slug } = useParams({ from: "/_authenticated/mocks/topic/$slug" });
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let alive = true;
    ensureTopicMock({ data: { slug } })
      .then((res) => {
        if (alive) navigate({ to: "/mocks/$paperId", params: { paperId: res.paperId }, replace: true });
      })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : "Could not prepare this topic test.");
      });
    return () => {
      alive = false;
    };
  }, [slug, navigate]);

  return (
    <AppShell>
      <div className="rounded-3xl border border-border/70 bg-card p-10 text-center shadow-soft">
        <Mascot size={72} mood="thinking" float className="mx-auto" />
        <p className="mt-3 font-display text-lg font-extrabold">
          {error ? "Topic test needs another try" : "Preparing your topic mock… 🎯"}
        </p>
        {error && <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{error}</p>}
      </div>
    </AppShell>
  );
}
