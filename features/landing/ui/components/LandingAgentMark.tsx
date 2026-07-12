import { cn } from "@/shared/lib/utils";

interface LandingAgentMarkProps {
  className?: string;
}

export function LandingAgentMark({ className }: LandingAgentMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-primary text-primary-foreground relative top-[0.03em] inline-flex size-[1.12em] shrink-0 items-center justify-center rounded-[0.26em] border border-transparent align-middle font-mono text-[0.78em] leading-none font-medium tracking-normal shadow-[0_0_0_1px_hsl(var(--primary)/0.08)]",
        className
      )}
    >
      △
    </span>
  );
}
