"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction } from "./lib/functionBuilders";
import {
  buildScopedPlanBatchPrompt,
  resolvePlanBatchApplication,
  type PlanBatchItemOperation,
} from "./lib/planBatchCore";
import { outreachAgent, outreachAgentBaseTools } from "./agents/outreach";
import { buildOutreachAgentPrompt } from "./agents/prompts";

type PlanBatchExecutionContext = {
  run: Doc<"planBatchRuns">;
  item: Doc<"planBatchItems">;
  prospect: Doc<"prospects">;
  activePlan: Doc<"outreachPlans"> | null;
};

type PlanBatchItemResult =
  | {
      outcome: "succeeded";
      planId: Id<"outreachPlans">;
      threadId: string;
    }
  | {
      outcome: "skipped";
      reason: string;
      threadId?: string;
    }
  | {
      outcome: "cancelled";
      reason: string;
    };

function getRuntimeSkipReason(prospect: Doc<"prospects">): string | null {
  if (prospect.origin === "setup_preview") return "setup_preview";
  if (prospect.status === "archived") return "archived";
  if (prospect.qualificationStatus === "disqualified") return "disqualified";
  if (prospect.qualificationStatus !== "qualified") return "not_qualified";
  return null;
}

function resolveAlreadyCompletedResult(
  context: PlanBatchExecutionContext,
  threadId?: string
): PlanBatchItemResult | null {
  const runtimeSkipReason = getRuntimeSkipReason(context.prospect);
  if (runtimeSkipReason) {
    return {
      outcome: "skipped",
      reason: runtimeSkipReason,
      ...(threadId ? { threadId } : {}),
    };
  }

  const application = resolvePlanBatchApplication({
    operation: context.item.operation,
    activePlan: context.activePlan
      ? {
          id: String(context.activePlan._id),
          version: context.activePlan.version,
        }
      : null,
    baselinePlanId: context.item.baselinePlanId
      ? String(context.item.baselinePlanId)
      : undefined,
    baselinePlanVersion: context.item.baselinePlanVersion,
    appliedPlanId: context.item.appliedPlanId
      ? String(context.item.appliedPlanId)
      : undefined,
    appliedPlanVersion: context.item.appliedPlanVersion,
  });
  if (application.outcome === "succeeded" && threadId && context.activePlan) {
    return {
      outcome: "succeeded",
      planId: context.activePlan._id,
      threadId,
    };
  }
  if (application.outcome === "skipped") {
    return {
      outcome: "skipped",
      reason: application.reason,
      ...(threadId ? { threadId } : {}),
    };
  }
  return null;
}

export const processPlanBatchItem = internalAction({
  args: { itemId: v.id("planBatchItems") },
  returns: v.any(),
  handler: async (ctx, { itemId }): Promise<PlanBatchItemResult> => {
    const claim = await ctx.runMutation(
      internal.planBatches.claimPlanBatchItemInternal,
      { itemId }
    );
    if (!claim.shouldRun) {
      return {
        outcome: "cancelled",
        reason: claim.cancelled
          ? "Batch cancelled"
          : claim.failed
            ? "Batch failed"
            : "Batch item is already terminal",
      };
    }

    const context = (await ctx.runQuery(
      internal.planBatches.getPlanBatchExecutionContextInternal,
      { itemId }
    )) as PlanBatchExecutionContext | null;
    if (!context) {
      throw new Error("Plan batch item context is unavailable.");
    }
    if (context.run.status === "cancelled") {
      return { outcome: "cancelled", reason: "Batch cancelled" };
    }

    const ensuredThread: { threadId: string; created: boolean } =
      await ctx.runMutation(
        internal.prospectThreads.ensureActiveThreadForProspectInternal,
        {
          prospectId: context.prospect._id,
          threadSummary: context.run.instruction.slice(0, 150),
        }
      );

    const alreadyCompleted = resolveAlreadyCompletedResult(
      context,
      ensuredThread.threadId
    );
    if (alreadyCompleted) {
      return alreadyCompleted;
    }

    const workspace = await ctx.runQuery(internal.workspaces.getById, {
      workspaceId: context.run.workspaceId,
    });
    const prompt = buildScopedPlanBatchPrompt({
      prospectName: context.prospect.displayName || context.prospect.externalId,
      operation: context.item.operation as PlanBatchItemOperation,
      sharedInstruction: context.run.instruction,
      sourcePrompt: context.run.sourcePrompt,
      targetInstruction: context.item.targetInstruction,
      attachments: context.run.attachments,
    });

    await outreachAgent.generateText(
      {
        ...ctx,
        planBatchItemId: context.item._id,
      },
      { threadId: ensuredThread.threadId },
      {
        prompt,
        system: buildOutreachAgentPrompt(workspace?.useCaseKey),
        tools: outreachAgentBaseTools,
        allowSystemInMessages: true,
      },
      {
        contextOptions: {
          recentMessages: 0,
          searchOptions: {
            limit: 0,
            textSearch: false,
            vectorSearch: false,
          },
        },
      }
    );

    const outcome = (await ctx.runQuery(
      internal.planBatches.getPlanBatchItemOutcomeInternal,
      { itemId }
    )) as {
      item: Doc<"planBatchItems">;
      activePlan: Doc<"outreachPlans"> | null;
    } | null;
    if (!outcome) {
      throw new Error("Plan batch result could not be verified.");
    }

    const completedContext: PlanBatchExecutionContext = {
      ...context,
      item: outcome.item,
      activePlan: outcome.activePlan,
    };
    const verified = resolveAlreadyCompletedResult(
      completedContext,
      ensuredThread.threadId
    );
    if (verified?.outcome === "succeeded") {
      return verified;
    }
    if (verified?.outcome === "skipped") {
      return verified;
    }

    const operationLabel =
      context.item.operation === "create" ? "create" : "update";
    throw new Error(
      `The prospect agent finished without persisting the requested plan ${operationLabel}.`
    );
  },
});
