import type { Doc } from "@/convex/_generated/dataModel";

type ProspectSummary = Doc<"prospectSummaries">;

export function dedupeProspectListResults(
  results: readonly ProspectSummary[]
): ProspectSummary[] {
  const seen = new Set<ProspectSummary["_id"]>();

  return results.filter((prospect) => {
    if (seen.has(prospect._id)) return false;
    seen.add(prospect._id);
    return true;
  });
}

export function shouldShowProspectFeedSkeleton(args: {
  browseMode: boolean;
  firstPageLoading: boolean;
  countsPending: boolean;
  expectedResultCount?: number;
  displayedResultCount: number;
}): boolean {
  if (args.firstPageLoading) return true;
  if (!args.browseMode) return false;

  return (
    args.countsPending ||
    (args.expectedResultCount !== undefined &&
      args.expectedResultCount > 0 &&
      args.displayedResultCount === 0)
  );
}
