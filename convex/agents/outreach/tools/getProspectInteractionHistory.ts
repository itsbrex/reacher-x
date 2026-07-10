"use node";

// Shared agent tool: reads the real platform interaction history for the
// selected prospect. Thin Layer 1 wrapper over platform sync actions and the
// normalized Layer 3 interaction read model.

import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ProspectInteractionHistoryItem } from "../../../lib/prospectInteractionHistoryCore";
import {
  AMBIGUOUS_PROSPECT_SELECTION_MESSAGE,
  MISSING_PROSPECT_SELECTION_MESSAGE,
  resolveSelectedThreadContext,
} from "./helpers";

/**
 * NOTE: These Zod enums mirror the Convex validators in validators.ts.
 * This duplication is intentional because @convex-dev/agent requires Zod.
 */
const platformSchema = z.enum(["all", "twitter", "linkedin"]);
const kindSchema = z.enum(["dm", "comment", "reply"]);
const directionSchema = z.enum(["all", "sent", "received"]);

type ProspectInteractionHistoryResult = {
  prospect: {
    name: string;
    platform: "twitter" | "linkedin";
  };
  items: ProspectInteractionHistoryItem[];
  truncated: boolean;
  coverage: Array<{
    platform: "twitter" | "linkedin";
    hasConversation: boolean;
    lastSyncSuccessAt?: number;
    lastSyncAttemptAt?: number;
    syncError?: string;
  }>;
  queriedAt: number;
};

type GetProspectInteractionHistoryResult =
  | {
      success: true;
      history: ProspectInteractionHistoryResult;
      refreshWarnings: string[];
    }
  | {
      success: false;
      history: null;
      error: string;
    };

export const getProspectInteractionHistory = createTool({
  description:
    "Read the actual interaction history between the workspace user and the selected prospect: X/LinkedIn DMs, comments, and replies, including direction and timestamps. Use this before answering what was said, what happened, who replied, or how the relationship has progressed. The selected prospect is resolved from the current prospect thread or an explicit tag in the main workspace thread.",
  inputSchema: z.object({
    platform: platformSchema
      .optional()
      .default("all")
      .describe("Read X, LinkedIn, or both platforms."),
    kinds: z
      .array(kindSchema)
      .min(1)
      .optional()
      .default(["dm", "comment", "reply"])
      .describe("Interaction types to include."),
    direction: directionSchema
      .optional()
      .default("all")
      .describe("Read sent interactions, received interactions, or both."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(20)
      .describe("Maximum number of interactions to return."),
    refresh: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        "Refresh connected-platform DM snapshots before reading when possible."
      ),
  }),
  execute: async (ctx, args): Promise<GetProspectInteractionHistoryResult> => {
    try {
      const selected = await resolveSelectedThreadContext(
        ctx,
        "getProspectInteractionHistory"
      );
      if (!selected?.prospectId) {
        return {
          success: false as const,
          history: null,
          error:
            selected && selected.ambiguousProspectIds.length > 1
              ? AMBIGUOUS_PROSPECT_SELECTION_MESSAGE
              : MISSING_PROSPECT_SELECTION_MESSAGE,
        };
      }
      if (typeof ctx.userId !== "string") {
        return {
          success: false as const,
          history: null,
          error: "Could not resolve the current user.",
        };
      }

      const userId = ctx.userId as Id<"users">;
      const prospectId = selected.prospectId;
      const refreshWarnings: string[] = [];
      if (args.refresh && args.kinds.includes("dm")) {
        const refreshes: Array<Promise<unknown>> = [];
        if (args.platform === "all" || args.platform === "twitter") {
          refreshes.push(
            ctx.runAction(internal.x.refreshProspectDmConversationInternal, {
              userId,
              prospectId,
            })
          );
        }
        if (args.platform === "all" || args.platform === "linkedin") {
          refreshes.push(
            ctx.runAction(
              internal.linkedin.getProspectLinkedInMessageStateInternal,
              { userId, prospectId }
            )
          );
        }

        const refreshResults = await Promise.allSettled(refreshes);
        for (const result of refreshResults) {
          if (result.status === "rejected") {
            refreshWarnings.push(
              result.reason instanceof Error
                ? result.reason.message
                : "A platform conversation refresh failed."
            );
          }
        }
      }

      const history: ProspectInteractionHistoryResult | null =
        await ctx.runQuery(
          internal.interactions.getProspectInteractionHistoryInternal,
          {
            userId,
            prospectId,
            platform: args.platform,
            kinds: args.kinds,
            direction: args.direction,
            limit: args.limit,
          }
        );
      if (!history) {
        return {
          success: false as const,
          history: null,
          error: "Prospect not found or unavailable to the current user.",
        };
      }

      return {
        success: true as const,
        history,
        refreshWarnings,
      };
    } catch (error) {
      return {
        success: false as const,
        history: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
