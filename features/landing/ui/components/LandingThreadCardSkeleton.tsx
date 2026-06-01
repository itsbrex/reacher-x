import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/components/Skeleton";

export function LandingThreadCardSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <article className={cn("flex w-full gap-4", className)}>
      {/* Avatar — top-aligned, not centered */}
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Header: name · @handle · time  ...  ⋯ menu */}
        <div className="mt-1 flex min-w-0 items-center gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Body text */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-[90%]" />
          <Skeleton className="h-5 w-[75%]" />
          <Skeleton className="h-5 w-[50%]" />
        </div>

        {/* Footer: 4 metrics spread across the width */}
        <div className="flex justify-between">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
    </article>
  );
}
