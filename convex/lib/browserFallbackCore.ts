"use node";

/**
 * X policy-block browser fallback (Layer 3).
 *
 * When the X API rejects a write with a policy 403 (`api_policy_forbidden`),
 * this core attempts the same action through the user's Kernel browser
 * connection — the logged-in x.com session in their browser profile —
 * within the daily cap, with human-like pacing and a proof screenshot.
 */

import { Buffer } from "node:buffer";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { executeXBrowserAction, type BrowserXActionKind } from "./kernelCore";

const BROWSER_ELIGIBLE_ACTION_KEYS = new Set<string>([
  "reply_to_post",
  "create_post",
  "like_post",
]);

export function isBrowserFallbackEligibleAction(actionKey: string): boolean {
  return BROWSER_ELIGIBLE_ACTION_KEYS.has(actionKey);
}

export interface BrowserFallbackAttemptArgs {
  userId: Id<"users">;
  workspaceId?: Id<"workspaces">;
  actionKey: string;
  tweetId?: string;
  text?: string;
}

export type BrowserFallbackAttemptResult =
  | {
      attempted: true;
      success: true;
      proofMediaUrl?: string;
    }
  | {
      attempted: true;
      success: false;
      error: string;
    }
  | {
      attempted: false;
      reason: string;
    };

/**
 * Attempt the action via the Kernel browser. `ctx` must be an action ctx
 * (needs runQuery/runMutation/storage). Never throws — callers decide how
 * to surface the outcome.
 */
export async function attemptBrowserFallback(
  ctx: any,
  args: BrowserFallbackAttemptArgs
): Promise<BrowserFallbackAttemptResult> {
  if (!isBrowserFallbackEligibleAction(args.actionKey)) {
    return {
      attempted: false,
      reason: "Action is not supported via browser sending.",
    };
  }

  const connection = await ctx.runQuery(
    internal.browserConnections.getBrowserConnectionForUserInternal,
    { userId: args.userId }
  );
  if (!connection || connection.status !== "connected") {
    return {
      attempted: false,
      reason:
        connection?.status === "needs_reconnect"
          ? "Browser sending needs reconnecting in Settings → Connected accounts."
          : "Browser sending is not enabled. Turn it on in Settings → Connected accounts.",
    };
  }

  const budget = await ctx.runMutation(
    internal.browserConnections.tryConsumeBrowserSendBudgetInternal,
    { userId: args.userId, workspaceId: args.workspaceId }
  );
  if (!budget.allowed) {
    return {
      attempted: false,
      reason: budget.reason ?? "Browser send budget unavailable.",
    };
  }

  const kind = args.actionKey as BrowserXActionKind;

  try {
    const result = await executeXBrowserAction({
      profileName: connection.kernelProfileName,
      input: {
        kind,
        tweetId: args.tweetId,
        text: args.text,
      },
    });

    await ctx.runMutation(
      internal.browserConnections.recordBrowserSendOutcomeInternal,
      {
        userId: args.userId,
        success: result.success,
        loggedOut: result.loggedOut,
        workspaceId: args.workspaceId,
      }
    );

    if (!result.success) {
      return {
        attempted: true,
        success: false,
        error:
          result.error ??
          (result.loggedOut
            ? "Browser session is logged out of X."
            : "Browser send failed."),
      };
    }

    let proofMediaUrl: string | undefined;
    if (result.proofScreenshotBase64) {
      try {
        const bytes = Buffer.from(result.proofScreenshotBase64, "base64");
        const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
        const storageId = await ctx.storage.store(blob);
        proofMediaUrl = (await ctx.storage.getUrl(storageId)) ?? undefined;
      } catch (proofError) {
        console.warn("[BrowserFallbackCore] Failed to store proof screenshot", {
          error:
            proofError instanceof Error
              ? proofError.message
              : String(proofError),
        });
      }
    }

    return { attempted: true, success: true, proofMediaUrl };
  } catch (error) {
    await ctx.runMutation(
      internal.browserConnections.recordBrowserSendOutcomeInternal,
      {
        userId: args.userId,
        success: false,
        workspaceId: args.workspaceId,
      }
    );
    return {
      attempted: true,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
