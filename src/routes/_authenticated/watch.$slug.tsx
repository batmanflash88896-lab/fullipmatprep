import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pretty } from "@/lib/format";
import { getSceneAudio, getVideoLesson } from "@/lib/video.functions";
import { ensureTopicMock } from "@/lib/mocks.functions";
import { findTopic } from "@/lib/syllabus";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Volume2,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/watch/$slug")({
  head: () => ({
    meta: [
      { title: "Video class with Sunny — AscendIPM" },
      {
        name: "description",
        content:
          "Watch a full Hinglish video class on one IPMAT subtopic — concept, shortcuts, previous-year questions and a topic test at the end.",
      },
      { property: "og:title", content: "Video class with Sunny — AscendIPM" },
      {
        property: "og:description",
        content: "Narrated IPMAT video classes, subtopic by subtopic, with checkpoints and a topic test.",
      },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WatchPage,
});

function WatchPage() {
  const { slug } = useParams({ from: "/_authenticated/watch/$slug" });
  const navigate = useNavigate();
  const found = findTopic(slug);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["video-lesson", slug],
    queryFn: () => getVideoLesson({ data: { slug } }),
    staleTime: Infinity,
    retry: false,
  });

  const scenes = data?.script.scenes ?? [];
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioBroken, setAudioBroken] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [checkpointDone, setCheckpointDone] = useState<Record<number, boolean>>({});
  const [finished, setFinished] = useState(false);
  const [building, setBuilding] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlCache = useRef<Record<number, string>>({});

  const checkpoint = data?.script.checkpoints.find(
    (c) => c.after === i && !checkpointDone[i],
  );

  const loadUrl = useCallback(
    async (index: number) => {
      const scene = scenes[index];
      if (!scene) return null;
      if (urlCache.current[index]) return urlCache.current[index];
      const res = await getSceneAudio({
        data: { slug, index, narration: scene.narration },
      });
      urlCache.current[index] = res.url;
      return res.url;
    },
    [scenes, slug],
  );

  // Play the current scene's narration, and warm up the next one in the background.
  useEffect(() => {
    let cancelled = false;
    if (!playing || checkpoint || scenes.length === 0) return;
    setLoadingAudio(true);
    loadUrl(i)
      .then((url) => {
        if (cancelled || !url) return;
        setAudioBroken(false);
        const el = audioRef.current;
        if (!el) return;
        el.src = url;
        return el.play();
      })
      .catch(() => !cancelled && setAudioBroken(true))
      .finally(() => !cancelled && setLoadingAudio(false));
    void loadUrl(i + 1).catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, playing, checkpoint, scenes.length]);

  function next() {
    setPicked(null);
    if (i < scenes.length - 1) setI(i + 1);
    else setFinished(true);
  }

  async function startTopicTest() {
    setBuilding(true);
    try {
      const { paperId } = await ensureTopicMock({ data: { slug } });
      navigate({ to: "/mocks/$paperId", params: { paperId } });
    } finally {
      setBuilding(false);
    }
  }

  if (isLoading || isError || !data) {
    return (
      <AppShell>
        <Link
          to="/learn"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> All topics
        </Link>
        <div className="rounded-3xl border border-border/70 bg-card p-8 text-center shadow-soft">
          <Mascot size={72} mood={isError ? "oops" : "thinking"} float className="mx-auto" />
          <p className="mt-3 font-display text-lg font-extrabold">
            {isError ? "Couldn't record this class 😅" : "Sunny is recording your class… 🎬"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isError
              ? "One more try and we're rolling."
              : `Writing the full video class on ${found?.topic.name ?? "this topic"} — board, examples, PYQs.`}
          </p>
          {isError && (
            <Button className="mt-4 bg-sunrise text-primary-foreground" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
            </Button>
          )}
        </div>
      </AppShell>
    );
  }

  const scene = scenes[i];
  const progress = ((i + 1) / scenes.length) * 100;

  return (
    <AppShell>
      <Link
        to="/learn"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> All topics
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            {data.chapter} · video class
          </p>
          <h1 className="font-display text-2xl font-extrabold">{data.script.title || data.topic}</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/learn/$slug" params={{ slug }}>
            Prefer chat class 💬
          </Link>
        </Button>
      </div>

      {/* -------- the "video" stage -------- */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-border/70 bg-card shadow-pop">
        <div className="relative aspect-video w-full bg-aurora p-5 text-primary-foreground sm:p-8">
          {checkpoint ? (
            <div key={`cp-${i}`} className="flex h-full flex-col overflow-y-auto animate-pop">
              <p className="text-xs font-bold uppercase tracking-wide opacity-90">Quick check ✋</p>
              <p className="mt-1 whitespace-pre-line text-base font-bold sm:text-lg">
                {pretty(checkpoint.prompt)}
              </p>
              <div className="mt-3 grid gap-2">
                {checkpoint.options.map((opt, oi) => {
                  const isRight = oi === checkpoint.correct_index;
                  const show = picked !== null;
                  return (
                    <button
                      key={oi}
                      disabled={show}
                      onClick={() => setPicked(oi)}
                      className={cn(
                        "flex items-center gap-2 rounded-2xl bg-primary-foreground/15 px-3 py-2 text-left text-sm font-medium backdrop-blur transition-colors",
                        show && isRight && "bg-success/80",
                        show && !isRight && oi === picked && "bg-destructive/70",
                      )}
                    >
                      {show && isRight ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : show && oi === picked ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/25 text-[11px] font-bold">
                          {String.fromCharCode(65 + oi)}
                        </span>
                      )}
                      {pretty(opt)}
                    </button>
                  );
                })}
              </div>
              {picked !== null && (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="whitespace-pre-line rounded-2xl bg-primary-foreground/15 p-3">
                    {pretty(checkpoint.solution)}
                  </p>
                  {checkpoint.trick && (
                    <p className="whitespace-pre-line rounded-2xl bg-primary-foreground/15 p-3">
                      ⚡ {pretty(checkpoint.trick)}
                    </p>
                  )}
                  <Button
                    className="bg-primary-foreground text-primary"
                    onClick={() => {
                      setCheckpointDone((d) => ({ ...d, [i]: true }));
                      setPicked(null);
                      setPlaying(true);
                      next();
                    }}
                  >
                    Continue the class ▶
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div key={i} className="flex h-full flex-col animate-slide-up">
              <p className="text-xs font-bold uppercase tracking-wide opacity-90">
                Scene {i + 1} of {scenes.length}
              </p>
              <h2 className="mt-1 font-display text-xl font-extrabold sm:text-3xl">
                {pretty(scene?.heading ?? "")}
              </h2>
              {scene?.highlight && (
                <p className="mt-3 inline-block self-start rounded-2xl bg-primary-foreground/20 px-4 py-2 font-display text-lg font-extrabold tabular-nums backdrop-blur sm:text-2xl">
                  {pretty(scene.highlight)}
                </p>
              )}
              <ul className="mt-3 space-y-1.5 overflow-y-auto text-sm leading-relaxed sm:text-base">
                {(scene?.bullets ?? []).map((b, bi) => (
                  <li
                    key={bi}
                    className="animate-slide-up"
                    style={{ animationDelay: `${bi * 140}ms` }}
                  >
                    • {pretty(b)}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center gap-2 pt-3">
                <Mascot size={44} mood={playing ? "cheer" : "idle"} float={playing} />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-bold backdrop-blur">
                  {loadingAudio ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading Sunny's voice…
                    </>
                  ) : audioBroken ? (
                    "Voice unavailable — read along 👇"
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5" /> Sunny is teaching
                    </>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* -------- player controls -------- */}
        <div className="border-t border-border/70 p-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-sunrise transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={i === 0}
              onClick={() => {
                audioRef.current?.pause();
                setPicked(null);
                setI(Math.max(0, i - 1));
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              className="bg-sunrise text-primary-foreground shadow-lift"
              onClick={() => {
                if (playing) {
                  audioRef.current?.pause();
                  setPlaying(false);
                } else {
                  setPlaying(true);
                }
              }}
            >
              {playing ? <Pause className="mr-1.5 h-4 w-4" /> : <Play className="mr-1.5 h-4 w-4" />}
              {playing ? "Pause" : i === 0 ? "Play class" : "Resume"}
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => {
                audioRef.current?.pause();
                next();
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-auto text-xs font-semibold text-muted-foreground">
              {i + 1}/{scenes.length}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-line rounded-2xl bg-secondary/60 p-3 text-sm leading-relaxed">
            {pretty(scene?.narration ?? "")}
          </p>
        </div>
      </div>

      <audio
        ref={audioRef}
        onEnded={() => {
          const hasCheckpoint = data.script.checkpoints.some((c) => c.after === i && !checkpointDone[i]);
          if (!hasCheckpoint) next();
        }}
        onError={() => setAudioBroken(true)}
        className="hidden"
      />

      {finished && (
        <div className="mt-5 rounded-3xl border border-border/70 bg-card p-6 shadow-soft animate-pop">
          <Mascot size={64} mood="happy" float />
          <h3 className="mt-2 font-display text-xl font-extrabold">Class done! 🎉</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {data.script.recap.map((r, ri) => (
              <li key={ri}>• {pretty(r)}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              className="bg-sunrise text-primary-foreground shadow-lift"
              disabled={building}
              onClick={startTopicTest}
            >
              {building ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Take the full topic test 🎯
            </Button>
            <Button asChild variant="outline">
              <Link to="/learn/$slug" params={{ slug }}>
                Practice with Sunny in chat
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setI(0);
                setFinished(false);
                setPlaying(false);
              }}
            >
              Watch again
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}