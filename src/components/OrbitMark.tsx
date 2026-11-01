import { cn } from "@/lib/utils";

/** Small "orbit" brand mark: a dot on an elliptical ring. */
export function OrbitMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("h-7 w-7", className)}
      fill="none"
    >
      <circle cx="16" cy="16" r="7.5" className="fill-primary" />
      <ellipse
        cx="16"
        cy="16"
        rx="14"
        ry="6.5"
        transform="rotate(-24 16 16)"
        className="stroke-primary/70"
        strokeWidth="1.6"
      />
      <circle cx="27.5" cy="10.5" r="2" className="fill-accent" />
    </svg>
  );
}
