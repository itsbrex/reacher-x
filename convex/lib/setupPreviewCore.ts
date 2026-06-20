import type { Id } from "../_generated/dataModel";

export const SETUP_PREVIEW_REVIEW_MODES = ["fallback", "qualified"] as const;

export type SetupPreviewReviewMode =
  (typeof SETUP_PREVIEW_REVIEW_MODES)[number];

export type SetupPreviewReviewSnapshot = {
  previewProspectIds: Id<"prospects">[];
  previewReviewMode: SetupPreviewReviewMode;
};

type ResolveSetupPreviewReviewSnapshotArgs = {
  currentPreviewProspectIds?: Id<"prospects">[];
  currentPreviewReviewMode?: SetupPreviewReviewMode;
  rankedQualifiedIds: Id<"prospects">[];
  rankedPreviewIds: Id<"prospects">[];
  limit: number;
};

function slicePreviewProspectIds(
  prospectIds: Id<"prospects">[],
  limit: number
): Id<"prospects">[] {
  return prospectIds.slice(0, limit);
}

function inferStoredPreviewReviewMode(args: {
  currentPreviewProspectIds: Id<"prospects">[];
  currentPreviewReviewMode?: SetupPreviewReviewMode;
  rankedQualifiedIds: Id<"prospects">[];
}): SetupPreviewReviewMode {
  if (args.currentPreviewReviewMode) {
    return args.currentPreviewReviewMode;
  }

  const rankedQualifiedIds = new Set(
    args.rankedQualifiedIds.map((prospectId) => String(prospectId))
  );

  return args.currentPreviewProspectIds.every((prospectId) =>
    rankedQualifiedIds.has(String(prospectId))
  )
    ? "qualified"
    : "fallback";
}

export function selectInitialSetupPreviewReviewSnapshot(args: {
  rankedQualifiedIds: Id<"prospects">[];
  rankedPreviewIds: Id<"prospects">[];
  limit: number;
}): SetupPreviewReviewSnapshot | null {
  if (args.rankedQualifiedIds.length > 0) {
    return {
      previewProspectIds: slicePreviewProspectIds(
        args.rankedQualifiedIds,
        args.limit
      ),
      previewReviewMode: "qualified",
    };
  }

  if (args.rankedPreviewIds.length > 0) {
    return {
      previewProspectIds: slicePreviewProspectIds(
        args.rankedPreviewIds,
        args.limit
      ),
      previewReviewMode: "fallback",
    };
  }

  return null;
}

export function resolveSetupPreviewReviewSnapshot(
  args: ResolveSetupPreviewReviewSnapshotArgs
): SetupPreviewReviewSnapshot | null {
  const currentPreviewProspectIds = slicePreviewProspectIds(
    args.currentPreviewProspectIds ?? [],
    args.limit
  );

  if (currentPreviewProspectIds.length === 0) {
    return selectInitialSetupPreviewReviewSnapshot({
      rankedQualifiedIds: args.rankedQualifiedIds,
      rankedPreviewIds: args.rankedPreviewIds,
      limit: args.limit,
    });
  }

  const currentPreviewReviewMode = inferStoredPreviewReviewMode({
    currentPreviewProspectIds,
    currentPreviewReviewMode: args.currentPreviewReviewMode,
    rankedQualifiedIds: args.rankedQualifiedIds,
  });

  if (
    currentPreviewReviewMode === "fallback" &&
    args.rankedQualifiedIds.length > 0
  ) {
    return {
      previewProspectIds: slicePreviewProspectIds(
        args.rankedQualifiedIds,
        args.limit
      ),
      previewReviewMode: "qualified",
    };
  }

  return {
    previewProspectIds: currentPreviewProspectIds,
    previewReviewMode: currentPreviewReviewMode,
  };
}

export function haveSamePreviewProspectIds(
  left: Id<"prospects">[],
  right: Id<"prospects">[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (String(left[index]) !== String(right[index])) {
      return false;
    }
  }

  return true;
}
