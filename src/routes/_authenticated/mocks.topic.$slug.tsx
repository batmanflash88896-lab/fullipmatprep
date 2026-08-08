import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
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
    ],
  }),
  component: TopicMockRedirect,
});

function TopicMockRedirect() {
  const { slug } = useParams({ from: "/_authenticated/mocks/topic/$slug" });
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    ensureTopicMock({ data: { slug } })
      .then((res) => {
        if (alive) navigate({ to: "/mocks/$paperId", params: { paperId: res.paperId }, replace: true });
      })
      .catch(() => {
        if (alive) navigate({ to: "/mocks", replace: true });
      });
    return () => {
      alive = false;
    };
  }, [slug, navigate]);

  return (
    <AppShell>
      <div className="rounded-3xl border border-border/70 bg-card p-10 text-center shadow-soft">
        <Mascot size={72} mood="thinking" float className="mx-auto" />
        <p className="mt-3 font-display text-lg font-extrabold">Preparing your topic mock… 🎯</p>
      </div>
    </AppShell>
  );
}
