interface SetupPreviewWaitingCopyArgs {
  entityPlural: string;
}

export interface SetupPreviewWaitingCopy {
  title: string;
  searchContext: string;
  previewDisclaimer: string;
  estimate: string;
  progressTitle: string;
}

export function getSetupPreviewWaitingCopy({
  entityPlural,
}: SetupPreviewWaitingCopyArgs): SetupPreviewWaitingCopy {
  const entitiesLower = entityPlural.toLowerCase();

  return {
    title: `Finding preview ${entitiesLower}`,
    searchContext: "Quick search based on your approved profiles.",
    previewDisclaimer: "Preview results may differ from final results.",
    estimate: "Most finish in 2–5 min. Some take up to 10.",
    progressTitle: "Preview search progress",
  };
}
