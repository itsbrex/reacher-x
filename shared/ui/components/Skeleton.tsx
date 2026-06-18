import { cn } from "@/shared/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-muted/80 relative isolate overflow-hidden rounded-md",
        className
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className={cn(
          "animate-skeleton-shimmer pointer-events-none absolute inset-0 motion-reduce:hidden",
          "bg-[length:220%_100%] bg-no-repeat",
          "bg-[linear-gradient(90deg,transparent_0%,transparent_28%,hsl(var(--background)/0.10)_40%,hsl(var(--background)/0.58)_50%,hsl(var(--background)/0.10)_60%,transparent_72%,transparent_100%)]"
        )}
      />
    </div>
  );
}

export { Skeleton };
