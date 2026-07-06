"use node";

// convex/agents/tools/continueProspectThread.ts
// Main △ Agent tool for delegating plan work to the selected prospect thread.
//
// Thin Layer-1 wrapper:
// - Resolves the selected prospect from the current workspace thread context
// - Hands the latest user request to that prospect's own △ Agent thread
// - Returns the resulting live plan preview for inline rendering

import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { createPlanPreviewArtifact } from "../../../shared/lib/json-render/agentArtifacts";
import { runLoggedAgentTool } from "./logging";
import {
  AMBIGUOUS_PROSPECT_SELECTION_MESSAGE,
  MISSING_PROSPECT_SELECTION_MESSAGE,
  resolveSelectedThreadContext,
} from "../outreach/tools/helpers";

type ProspectThreadPlanTask = {
  id: string;
  order: number;
  type: string;
  description: string;
  status: string;
  content?: string;
  targetTweetId?: string;
};

export const continueProspectThread = createTool({
  description:
    "Send the user's latest plan-related request from this main workspace thread to the selected prospect's own △ Agent thread, wait for that thread to complete, and return the resulting plan preview. Use this for creating or revising a single prospect's plan from the main /agent workspace thread.",
  inputSchema: z.object({}),
  execute: async (
    ctx
  ): Promise<{
    success: boolean;
    hasPlan: boolean;
    threadId?: string;
    message: string;
    plan?: {
      id: string;
      status: string;
      strategy: {
        rationale: string;
        targetTweetId?: string;
        valueProposition: string;
        tone: string;
      };
      version: number;
    } | null;
    tasks?: ProspectThreadPlanTask[];
    artifact?: ReturnType<typeof createPlanPreviewArtifact>;
    error?: string;
  }> =>
    runLoggedAgentTool(
      ctx,
      {
        moduleName: "continueProspectThread",
      },
      async (logEvent) => {
        const selectedContext = await resolveSelectedThreadContext(
          ctx,
          "continueProspectThread",
          logEvent
        );

        if (!selectedContext?.prospectId) {
          return {
            success: false,
            hasPlan: false,
            message: MISSING_PROSPECT_SELECTION_MESSAGE,
            error: "Missing selected prospect context",
          };
        }

        if (selectedContext.ambiguousProspectIds.length > 1) {
          return {
            success: false,
            hasPlan: false,
            message: AMBIGUOUS_PROSPECT_SELECTION_MESSAGE,
            error: "Ambiguous prospect context",
          };
        }

        const result = await ctx.runAction(
          internal.chat.continueProspectThreadFromWorkspace,
          {
            prospectId: selectedContext.prospectId as Id<"prospects">,
            sourceThreadId: ctx.threadId ?? "",
          }
        );

        const tasks: ProspectThreadPlanTask[] =
          result.tasks?.map((task: Doc<"outreachTasks">) => ({
            id: task._id,
            order: task.order,
            type: task.type,
            description: task.description,
            status: task.status,
            content: task.content,
            targetTweetId: task.targetTweetId,
          })) ?? [];

        const artifact = result.plan
          ? createPlanPreviewArtifact({
              planId: result.plan._id,
              prospectId: result.plan.prospectId,
              status: result.plan.status,
              rationale: result.plan.strategy.rationale,
              tasks: tasks.map((task) => ({
                _id: task.id,
                order: task.order,
                type: task.type,
                description: task.description,
                status: task.status,
                content: task.content,
                targetTweetId: task.targetTweetId,
              })),
            })
          : undefined;

        return {
          success: result.success,
          hasPlan: Boolean(result.plan),
          threadId: result.threadId,
          message:
            result.assistantText ??
            (result.plan
              ? "The selected prospect thread created or updated the outreach plan."
              : "The selected prospect thread finished without producing an active plan."),
          plan: result.plan
            ? {
                id: result.plan._id,
                status: result.plan.status,
                strategy: result.plan.strategy,
                version: result.plan.version,
              }
            : null,
          tasks,
          artifact,
        };
      }
    ),
});
