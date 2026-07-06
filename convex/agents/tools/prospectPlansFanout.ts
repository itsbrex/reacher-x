// convex/agents/tools/prospectPlansFanout.ts
// Main △ Agent fan-out tools: workspace-wide plan overview and batch plan
// updates. Thin wrappers - Layer 1. Each batch instruction is delivered to
// the prospect's own △ Agent thread (sub-agent model).

import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  resolveWorkspaceMemoryContext,
  type ToolContext,
} from "./workspaceMemoryHelpers";

interface WorkspacePlanOverviewItem {
  planId: Id<"outreachPlans">;
  prospectId: Id<"prospects">;
  prospectName: string;
  prospectPlatform: string;
  prospectStatus: string;
  planStatus: string;
  version: number;
  rationale: string;
  taskCount: number;
  completedTasks: number;
  updatedAt: number;
}

async function resolveWorkspaceIdForUser(
  ctx: ToolContext,
  moduleName: string
): Promise<Id<"workspaces"> | null> {
  const memoryContext = await resolveWorkspaceMemoryContext(
    ctx,
    moduleName,
    null
  );
  return memoryContext.workspaceId
    ? (memoryContext.workspaceId as Id<"workspaces">)
    : null;
}

/**
 * Workspace-wide plan status overview for the main △ Agent.
 */
export const listProspectPlans = createTool({
  description:
    "List all active outreach plans across the workspace with their prospect names, statuses, and progress. Use this to give the user a portfolio overview or before applying a batch instruction with updatePlansBatch. No arguments needed.",
  inputSchema: z.object({}),
  execute: async (
    ctx
  ): Promise<{
    success: boolean;
    plans: Array<{
      prospectName: string;
      platform: string;
      planStatus: string;
      version: number;
      progress: string;
      rationale: string;
    }>;
    error?: string;
  }> => {
    try {
      const workspaceId = await resolveWorkspaceIdForUser(
        ctx,
        "listProspectPlans"
      );
      if (!workspaceId) {
        return {
          success: false,
          plans: [],
          error: "Could not resolve the current workspace.",
        };
      }

      const plans: WorkspacePlanOverviewItem[] = await ctx.runQuery(
        internal.outreach.listWorkspacePlansInternal,
        { workspaceId }
      );

      return {
        success: true,
        plans: plans.map((plan) => ({
          prospectName: plan.prospectName,
          platform: plan.prospectPlatform,
          planStatus: plan.planStatus,
          version: plan.version,
          progress: `${plan.completedTasks}/${plan.taskCount} tasks done`,
          rationale: plan.rationale,
        })),
      };
    } catch (error) {
      return {
        success: false,
        plans: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Batch plan updates: fan an instruction out to each selected prospect's
 * own △ Agent thread.
 */
export const updatePlansBatch = createTool({
  description:
    "Apply one instruction to many outreach plans at once. Each selected prospect's own △ Agent receives the instruction in its thread and refines that prospect's plan with full context. Use prospectNames to target specific prospects by name/handle, or omit it to target ALL prospects with active plans. Call listProspectPlans first if you need to see what exists.",
  inputSchema: z.object({
    instruction: z
      .string()
      .describe(
        "The instruction to apply to each plan, e.g. 'Make the openers shorter and reference their latest post' or 'Drop the follow-up DMs, comments only'."
      ),
    prospectNames: z
      .array(z.string())
      .optional()
      .describe(
        "Optional: prospect names or handles to target. Omit to target all prospects with active plans."
      ),
  }),
  execute: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    dispatched: number;
    skipped: Array<{ prospectId: string; reason: string }>;
    unmatchedNames?: string[];
    error?: string;
  }> => {
    try {
      const workspaceId = await resolveWorkspaceIdForUser(
        ctx,
        "updatePlansBatch"
      );
      if (!workspaceId) {
        return {
          success: false,
          dispatched: 0,
          skipped: [],
          error: "Could not resolve the current workspace.",
        };
      }

      const plans: WorkspacePlanOverviewItem[] = await ctx.runQuery(
        internal.outreach.listWorkspacePlansInternal,
        { workspaceId }
      );

      let targetProspectIds: Id<"prospects">[];
      const unmatchedNames: string[] = [];

      if (args.prospectNames && args.prospectNames.length > 0) {
        const matched = new Set<Id<"prospects">>();
        for (const rawName of args.prospectNames) {
          const name = rawName.trim().replace(/^@/, "").toLowerCase();
          if (!name) continue;
          const plan = plans.find((item) =>
            item.prospectName.toLowerCase().includes(name)
          );
          if (plan) {
            matched.add(plan.prospectId);
          } else {
            unmatchedNames.push(rawName);
          }
        }
        targetProspectIds = [...matched];
      } else {
        targetProspectIds = [...new Set(plans.map((plan) => plan.prospectId))];
      }

      if (targetProspectIds.length === 0) {
        return {
          success: false,
          dispatched: 0,
          skipped: [],
          unmatchedNames,
          error:
            unmatchedNames.length > 0
              ? "No prospects matched the provided names."
              : "No prospects with active plans found in this workspace.",
        };
      }

      const result = await ctx.runMutation(
        internal.chat.fanOutProspectInstructionsInternal,
        {
          workspaceId,
          prospectIds: targetProspectIds,
          instruction: args.instruction,
        }
      );

      return {
        success: result.dispatched > 0,
        dispatched: result.dispatched,
        skipped: result.skipped,
        ...(unmatchedNames.length > 0 ? { unmatchedNames } : {}),
      };
    } catch (error) {
      return {
        success: false,
        dispatched: 0,
        skipped: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
