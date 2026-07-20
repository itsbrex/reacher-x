"use node";

// convex/agents/outreach/tools/inspectWorkspace.ts
// Agent tool: full workspace inspection (description, ICPs, connected
// accounts, autonomy settings). Thin wrapper - Layer 1.

import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import { extractProspectThreadContext } from "./helpers";

export interface InspectWorkspaceResult {
  success: boolean;
  workspace: {
    name: string;
    description: string;
    useCaseKey: string | null;
    icps: Array<{
      title: string;
      description: string;
      painPoints: string[];
      channels: string[];
    }>;
    pendingIdealProfileProposal: {
      requestId: string;
      revision: number;
      profiles: Array<{
        title: string;
        description: string;
        painPoints: string[];
        channels: string[];
      }>;
      addedTitles: string[];
      updatedTitles: string[];
      removedTitles: string[];
    } | null;
    connectedAccounts: {
      x: {
        username: string;
        status: string;
        subscriptionType: string | null;
      } | null;
      linkedin: {
        username: string | null;
        status: string;
        premium: boolean;
      } | null;
    };
    agentSettings: {
      autonomyMode: string;
    };
  } | null;
  error?: string;
}

/**
 * Inspect the current workspace: what the user offers, who they target
 * (ICPs), which social accounts are connected, and how autonomous the
 * △ Agent is allowed to be.
 */
export const inspectWorkspace = createTool({
  description:
    "Inspect the current workspace: the user's offering/description, saved ideal profiles, any pending workspace-wide ideal-profile proposal, connected social accounts (X/LinkedIn), and agent autonomy settings. When refining profiles, preserve the complete pending proposal when present instead of rebuilding from only the saved profiles. No arguments needed - workspace is resolved from thread context.",
  inputSchema: z.object({}),
  execute: async (ctx): Promise<InspectWorkspaceResult> => {
    try {
      const { workspaceId } = await extractProspectThreadContext(
        ctx,
        "inspectWorkspace"
      );

      if (!workspaceId) {
        return {
          success: false,
          workspace: null,
          error:
            "Could not resolve the workspace from this conversation thread.",
        };
      }

      const inspection = await ctx.runQuery(
        internal.workspaces.getWorkspaceInspectionInternal,
        { workspaceId }
      );

      if (!inspection) {
        return {
          success: false,
          workspace: null,
          error: "Workspace not found.",
        };
      }

      return {
        success: true,
        workspace: {
          ...inspection,
          useCaseKey: inspection.useCaseKey
            ? String(inspection.useCaseKey)
            : null,
        },
      };
    } catch (error) {
      return {
        success: false,
        workspace: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
