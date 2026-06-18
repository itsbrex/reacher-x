"use client";

import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/components/Skeleton";

interface ComposerSurfaceSkeletonProps {
  className?: string;
  compact?: boolean;
  submitLabel?: string;
}

export function ComposerSurfaceSkeleton({
  className,
  compact = false,
  submitLabel = "Reply",
}: ComposerSurfaceSkeletonProps) {
  const actionSizeClassName = compact ? "h-7 w-7" : "h-8 w-8";

  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      <div className="flex items-start gap-3">
        <Skeleton
          className={cn(
            "rounded-full",
            compact ? "mt-0.5 h-8 w-8" : "mt-1 h-10 w-10"
          )}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className={compact ? "h-4 w-16" : "h-4 w-20"} />
            <Skeleton className={compact ? "h-4 w-20" : "h-4 w-28"} />
          </div>
          <Skeleton
            className={cn("w-full rounded-xl", compact ? "h-20" : "h-28")}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className={cn("rounded-md", actionSizeClassName)} />
          <Skeleton className={cn("rounded-md", actionSizeClassName)} />
          <Skeleton className={cn("rounded-md", actionSizeClassName)} />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className={compact ? "h-4 w-10" : "h-4 w-16"} />
          <Skeleton
            className="h-9 rounded-md"
            style={{ width: `${Math.max(submitLabel.length * 8, 72)}px` }}
          />
        </div>
      </div>
    </div>
  );
}
