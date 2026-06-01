import { LandingThreadCardSkeleton } from "../LandingThreadCardSkeleton";

export function RecentThreadsSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {Array.from({ length: 2 }, (_, index) => (
        <LandingThreadCardSkeleton key={index} />
      ))}
    </div>
  );
}
