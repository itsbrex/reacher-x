export type OutreachTaskPanelKind = "post" | "dm";

export interface ResolveOutreachTaskApprovalUiStateArgs {
  kind: OutreachTaskPanelKind;
  platform?: "twitter" | "linkedin" | null;
  mode?: "approval" | "posted" | null;
  approvalReady: boolean;
  planId?: string | null;
  planStatus?: string | null;
}

export interface OutreachTaskApprovalUiState {
  submitBlockedByPlan: boolean;
  planCanBeApproved: boolean;
  submitButtonText: string;
}

export function resolveOutreachTaskApprovalUiState(
  args: ResolveOutreachTaskApprovalUiStateArgs
): OutreachTaskApprovalUiState {
  const submitBlockedByPlan = args.mode === "approval" && !args.approvalReady;
  const planCanBeApproved =
    submitBlockedByPlan && args.planStatus === "draft" && Boolean(args.planId);

  return {
    submitBlockedByPlan,
    planCanBeApproved,
    submitButtonText: submitBlockedByPlan
      ? planCanBeApproved
        ? "Approve plan"
        : "Preparing approval"
      : args.kind === "dm"
        ? "Approve DM"
        : args.platform === "linkedin"
          ? "Approve comment"
          : "Approve reply",
  };
}
