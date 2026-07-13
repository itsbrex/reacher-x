import { v } from "convex/values";
import { vWorkflowId } from "@convex-dev/workflow";
import { vResultValidator } from "@convex-dev/workpool";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../lib/functionBuilders";
import { getProspectActivePlan } from "../lib/outreachCore";
import type { AutoPlanGenerationResult } from "../lib/autoPlanCore";
import { workflow } from "../lib/workflow";
import {
  autoPlanGenerationResultValidator,
  autoPlanWorkflowCompletionContextValidator,
} from "../validators";
import { getCurrentUTCTimestamp } from "../../shared/lib/utils/time/timeUtils";

const AUTO_PLAN_STEP_RETRY = {
  maxAttempts: 3,
  initialBackoffMs: 2_000,
  base: 2,
} as const;

export const autoPlanGenerationWorkflow = workflow.define({
  args: {
    prospectId: v.id("prospects"),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  returns: autoPlanGenerationResultValidator,
  handler: async (
    step,
    args
  ): Promise<AutoPlanGenerationResult<Id<"outreachPlans">>> => {
    const thread: { threadId: string; created: boolean } =
      await step.runMutation(
        internal.prospectThreads.ensureActiveThreadForProspectInternal,
        {
          prospectId: args.prospectId,
          threadSummary: "Auto-generated, research-grounded outreach plan",
        }
      );

    const result: AutoPlanGenerationResult<Id<"outreachPlans">> =
      await step.runAction(
        internal.autoPlanActions.generateGroundedAutoPlanDraft,
        {
          ...args,
          threadId: thread.threadId,
        },
        { retry: AUTO_PLAN_STEP_RETRY }
      );

    const persistedPlan = await step.runQuery(
      internal.outreach.getProspectActivePlanInternal,
      { prospectId: args.prospectId }
    );
    if (
      !persistedPlan ||
      persistedPlan.plan._id !== result.planId ||
      persistedPlan.tasks.length === 0
    ) {
      throw new Error(
        "Automatic plan generation finished without a persisted plan and tasks"
      );
    }

    await step.runMutation(internal.prospects.updatePlanGenerationStatus, {
      prospectId: args.prospectId,
      status: "completed",
    });

    return result;
  },
});

export const handleAutoPlanWorkflowComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: autoPlanWorkflowCompletionContextValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const prospect = await ctx.db.get(args.context.prospectId);
    if (!prospect) {
      return null;
    }

    const persistedPlan = await getProspectActivePlan(ctx, prospect._id);
    const hasPersistedPlan = Boolean(
      persistedPlan && persistedPlan.tasks.length > 0
    );
    const status =
      args.result.kind === "success" && hasPersistedPlan
        ? "completed"
        : prospect.status === "archived"
          ? "idle"
          : "failed";

    await ctx.db.patch(prospect._id, {
      planGenerationStatus: status,
      updatedAt: getCurrentUTCTimestamp(),
    });

    if (status === "failed") {
      const error =
        args.result.kind === "failed"
          ? args.result.error
          : args.result.kind === "canceled"
            ? "Workflow canceled"
            : "Workflow completed without a persisted plan and tasks";
      console.error("[AutoPlanWorkflow] Automatic plan generation failed", {
        workflowId: String(args.workflowId),
        prospectId: String(prospect._id),
        error,
      });
    }

    return null;
  },
});
