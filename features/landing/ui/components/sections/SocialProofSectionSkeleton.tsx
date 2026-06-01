import { LandingThreadCardSkeleton } from "../LandingThreadCardSkeleton";

export function SocialProofSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <LandingThreadCardSkeleton key={index} />
      ))}
    </div>
  );
}
