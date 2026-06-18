import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/components/Skeleton";

interface IdealCustomerProfileCardSkeletonProps {
  className?: string;
}

export function IdealCustomerProfileCardSkeleton({
  className,
}: IdealCustomerProfileCardSkeletonProps) {
  return (
    <article className={cn("card-fade-bottom", className)}>
      <div className="space-y-2.5 py-3">
        <header className="space-y-1.5">
          <Skeleton className="h-4 w-40 rounded-sm" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-full rounded-sm" />
            <Skeleton className="h-4 w-[88%] rounded-sm" />
            <Skeleton className="h-4 w-[78%] rounded-sm" />
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-28 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-6 w-[4.5rem] rounded-md" />
        </div>

        <div className="flex items-center gap-3 pt-0.5">
          <Skeleton className="h-3 w-16 rounded-sm" />
          <Skeleton className="h-3 w-14 rounded-sm" />
        </div>
      </div>
    </article>
  );
}
