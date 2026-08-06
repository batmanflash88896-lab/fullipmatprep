import mascot from "@/assets/mentor-mascot.png";
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
  className,
}: {
  mood?: Mood;
  size?: number;
  float?: boolean;
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
        width={816}
        height={816}
        loading="lazy"
        className="h-[86%] w-[86%] object-contain"
      />
    </span>
  );
}

export type { Mood };