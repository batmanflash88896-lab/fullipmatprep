import mascot from "@/assets/mentor-mascot.webp";
import { cn } from "@/lib/utils";

type Mood = "idle" | "thinking" | "happy" | "oops" | "cheer";

const moodRing: Record<Mood, string> = {
  idle: "ring-border",
  thinking: "ring-accent animate-pulse",
  happy: "ring-success",
  oops: "ring-destructive",
  cheer: "ring-primary",
};

export function Mascot({
  mood = "idle",
  size = 56,
  float = false,
  priority = false,
  className,
}: {
  mood?: Mood;
  size?: number;
  float?: boolean;
  priority?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-secondary/60 ring-2 ring-offset-2 ring-offset-background transition-all",
        moodRing[mood],
        float && "animate-float",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={mascot}
        alt="Sunny, your AI study mentor"
        width={256}
        height={256}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="h-[86%] w-[86%] object-contain"
      />
    </span>
  );
}

export type { Mood };