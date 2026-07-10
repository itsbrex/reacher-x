"use node";

// Main △ Agent tool: live workspace operational state. Thin Layer 1 wrapper
// over the maintained workspace read model.

import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { resolveWorkspaceMemoryContext } from "./workspaceMemoryHelpers";

type WorkspaceOperationalSnapshot = {
  workspace: {
    name: string;
    useCaseKey: string | null;
  };
  prospects: {
    total: number;
    qualified: number;
    enriched: number;
    readyQualifiedEnriched: number;
    actionableReady: number;
    averageQualificationScore: number;
    byStatus: {
      new: number;
      contacted: number;
      inProgress: number;
      converted: number;
      archived: number;
    };
    byPlatform: {
      twitter: number;
      linkedin: number;
    };
  };
  outreach: {
    plansGenerated: number;
  };
  notifications: {
    pending: number;
  };
  agent: {
    autonomyMode: string;
    workflowStatus: string;
    systemMode: string;
    pauseReason: string | null;
    issueReason: string | null;
    canResume: boolean;
  };
  sourceUpdatedAt: number;
  queriedAt: number;
};

type QueryWorkspaceResult =
  | {
      success: true;
      snapshot: WorkspaceOperationalSnapshot;
    }
  | {
      success: false;
      snapshot: null;
      error: string;
    };

export const queryWorkspace = createTool({
  description:
    "Read the current workspace's live operational state: exact prospect totals and qualification counts, pipeline statuses, platform counts, generated-plan count, pending notifications, discovery status, autonomy mode, and blockers. Use this for any question whose answer depends on mutable workspace data. Do not infer these facts from plans or chat history.",
  inputSchema: z.object({}),
  execute: async (ctx): Promise<QueryWorkspaceResult> => {
    try {
      const resolved = await resolveWorkspaceMemoryContext(
        ctx,
        "queryWorkspace",
        null
      );
      if (!resolved.workspaceId) {
        return {
          success: false as const,
          snapshot: null,
          error: "Could not resolve the current workspace.",
        };
      }

      const snapshot: WorkspaceOperationalSnapshot | null = await ctx.runQuery(
        internal.workspaces.getWorkspaceOperationalSnapshotInternal,
        {
          workspaceId: resolved.workspaceId as Id<"workspaces">,
        }
      );

      if (!snapshot) {
        return {
          success: false as const,
          snapshot: null,
          error: "Workspace not found.",
        };
      }

      return {
        success: true as const,
        snapshot,
      };
    } catch (error) {
      return {
        success: false as const,
        snapshot: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
