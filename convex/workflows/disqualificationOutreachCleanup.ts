import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../lib/functionBuilders";
import {
  createEmptyDisqualificationOutreachCleanupSummary,
  DISQUALIFICATION_ACTIVE_PLAN_STATUSES,
  loadDisqualificationOutreachPlanArtifacts,
  mergeDisqualificationOutreachCleanupSummaries,
  reconcileDisqualifiedOutreachPlan,
  summarizeDisqualificationOutreachPlanCleanup,
  type DisqualificationOutreachCleanupSummary,
} from "../lib/disqualificationOutreachCore";
import { workflow } from "../lib/workflow";
import {
  disqualificationOutreachCleanupPreviewValidator,
  disqualificationOutreachCleanupStartResultValidator,
  disqualificationOutreachCleanupSummaryValidator,
  disqualificationOutreachCleanupWorkflowResultValidator,
  disqualificationOutreachPlanCleanupPreviewValidator,
  outreachPlanStatusValidator,
} from "../validators";

const PLAN_PAGE_SIZE = 50;

type CleanupPreview = {
  planIds: Id<"outreachPlans">[];
  summary: DisqualificationOutreachCleanupSummary;
};

export const listWorkspacePlansByStatusPageInternal = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
    status: outreachPlanStatusValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) =>
    await ctx.db
      .query("outreachPlans")
      .withIndex("by_workspace_status", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", args.status)
      )
      .paginate(args.paginationOpts),
});

export const previewPlanCleanupInternal = internalQuery({
  args: { planId: v.id("outreachPlans") },
  returns: disqualificationOutreachPlanCleanupPreviewValidator,
  handler: async (ctx, args) => {
    const plan = await ctx.db.get("outreachPlans", args.planId);
    if (!plan) return null;
    const prospect = await ctx.db.get("prospects", plan.prospectId);
    if (!prospect || prospect.qualificationStatus !== "disqualified") {
      return null;
    }
    const artifacts = await loadDisqualificationOutreachPlanArtifacts(
      ctx.db,
      plan._id
    );
    const summary = summarizeDisqualificationOutreachPlanCleanup({
      plan,
      artifacts,
    });
    return summary.plans === 0 ? null : { planId: plan._id, summary };
  },
});

async function collectWorkspaceCleanupPreview(
  ctx: ActionCtx,
  workspaceId: Id<"workspaces">
): Promise<CleanupPreview> {
  const planIds: Id<"outreachPlans">[] = [];
  let summary = createEmptyDisqualificationOutreachCleanupSummary();

  for (const status of DISQUALIFICATION_ACTIVE_PLAN_STATUSES) {
    let cursor: string | null = null;
    while (true) {
      const page: {
        page: Doc<"outreachPlans">[];
        continueCursor: string;
        isDone: boolean;
      } = await ctx.runQuery(
        internal.workflows.disqualificationOutreachCleanup
          .listWorkspacePlansByStatusPageInternal,
        {
          workspaceId,
          status,
          paginationOpts: { cursor, numItems: PLAN_PAGE_SIZE },
        }
      );

      for (const plan of page.page) {
        const preview: {
          planId: Id<"outreachPlans">;
          summary: DisqualificationOutreachCleanupSummary;
        } | null = await ctx.runQuery(
          internal.workflows.disqualificationOutreachCleanup
            .previewPlanCleanupInternal,
          { planId: plan._id }
        );
        if (!preview) continue;
        planIds.push(preview.planId);
        summary = mergeDisqualificationOutreachCleanupSummaries(
          summary,
          preview.summary
        );
      }

      if (page.isDone) break;
      cursor = page.continueCursor;
    }
  }

  return { planIds, summary };
}

export const previewWorkspaceCleanup = internalAction({
  args: { workspaceId: v.id("workspaces") },
  returns: disqualificationOutreachCleanupPreviewValidator,
  handler: async (ctx, args): Promise<CleanupPreview> =>
    await collectWorkspaceCleanupPreview(ctx, args.workspaceId),
});

export const applyPlanCleanupInternal = internalMutation({
  args: { planId: v.id("outreachPlans") },
  returns: disqualificationOutreachCleanupSummaryValidator,
  handler: async (ctx, args) =>
    await reconcileDisqualifiedOutreachPlan(ctx, args.planId),
});

export const cleanupWorkflow = workflow.define({
  args: {
    workspaceId: v.id("workspaces"),
    planIds: v.array(v.id("outreachPlans")),
  },
  returns: disqualificationOutreachCleanupWorkflowResultValidator,
  handler: async (step, args) => {
    let summary = createEmptyDisqualificationOutreachCleanupSummary();
    for (const planId of args.planIds) {
      const result: DisqualificationOutreachCleanupSummary =
        await step.runMutation(
          internal.workflows.disqualificationOutreachCleanup
            .applyPlanCleanupInternal,
          { planId }
        );
      summary = mergeDisqualificationOutreachCleanupSummaries(summary, result);
    }

    const analyticsResult: { analyticsRowsRebuilt: number } =
      await step.runAction(
        internal.workspaceAnalyticsDaily.rebuildWorkspaceAnalyticsDailyInternal,
        { workspaceId: args.workspaceId },
        { retry: true }
      );

    return {
      summary,
      analyticsRowsRebuilt: analyticsResult.analyticsRowsRebuilt,
    };
  },
});

export const startWorkspaceCleanup = internalAction({
  args: { workspaceId: v.id("workspaces") },
  returns: disqualificationOutreachCleanupStartResultValidator,
  handler: async (ctx, args) => {
    const preview = await collectWorkspaceCleanupPreview(ctx, args.workspaceId);
    if (preview.planIds.length === 0) {
      return { started: false, preview };
    }

    const workflowId: Awaited<ReturnType<typeof workflow.start>> =
      await workflow.start(
        ctx,
        internal.workflows.disqualificationOutreachCleanup.cleanupWorkflow,
        {
          workspaceId: args.workspaceId,
          planIds: preview.planIds,
        }
      );
    return { started: true, workflowId: String(workflowId), preview };
  },
});
