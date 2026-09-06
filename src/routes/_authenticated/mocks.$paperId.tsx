import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { ExamRunner } from "@/components/ExamRunner";
import { getMockPaper } from "@/lib/mocks.functions";
import { ArrowLeft, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mocks/$paperId")({
  head: () => ({
    meta: [
      { title: "Attempt mock paper — AscendIPM" },
      {
        name: "description",
        content: "Timed IPMAT mock paper with instant scoring, full solutions, shortcuts and traps.",
      },
      { property: "og:title", content: "Attempt mock paper — AscendIPM" },
      { property: "og:description", content: "Timed IPMAT mock with instant scoring and full solutions." },
    ],
  }),
  component: MockPaperPage,
});

function MockPaperPage() {
  const { paperId } = useParams({ from: "/_authenticated/mocks/$paperId" });
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["mock-paper", paperId],
    queryFn: () => getMockPaper({ data: { paperId } }),
    staleTime: Infinity,
    retry: false,
  });

  if (data) {
    return <ExamRunner paper={data.paper} questions={data.questions} />;
  }

  return (
    <AppShell>
      <Link
        to="/mocks"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All mocks
      </Link>

      {isLoading && (
        <div className="rounded-3xl border border-border/70 bg-card p-8 text-center shadow-soft">
          <Mascot size={70} mood="thinking" float className="mx-auto" />
          <p className="mt-3 font-display text-lg font-extrabold">Setting your paper… ✍️</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Building every section and checking the final count. A new full paper can take about a minute.
          </p>
        </div>
      )}

      {isError && (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <Mascot size={64} mood="oops" className="mx-auto" />
          <p className="mt-3 font-display text-lg font-extrabold">This paper needs another pass</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "The paper could not be prepared right now."}
          </p>
          <Button disabled={isFetching} className="mt-4 bg-sunrise text-primary-foreground" onClick={() => refetch()}>
            <RefreshCw className={isFetching ? "mr-1.5 h-4 w-4 animate-spin" : "mr-1.5 h-4 w-4"} /> Retry paper
          </Button>
        </div>
      )}

    </AppShell>
  );
}
