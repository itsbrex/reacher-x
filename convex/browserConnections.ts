import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, internalQuery, internalMutation } from "./lib/functionBuilders";
import { requireUser, getDefaultWorkspaceForUser } from "./lib/accessHelpers";
import { browserConnectionStatusValidator } from "./validators";
import { createNotification } from "./lib/outreachCore";
import { getCurrentUTCTimestamp } from "../shared/lib/utils/time/timeUtils";

/** Default daily browser send cap when no workspace setting applies. */
export const DEFAULT_DAILY_BROWSER_SEND_CAP = 15;
/** Consecutive failures before browser sending pauses (stop-loss). */
const STOP_LOSS_CONSECUTIVE_FAILURES = 3;

function getUtcDayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Browser sending status for the current user's connected X account.
 * Powers the "Enable browser sending" row on /settings/connected-accounts.
 */
export const getBrowserSendingStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const connection = await ctx.db
      .query("browserConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!connection) {
      return { status: "not_configured" as const };
    }

    return {
      status: connection.status,
      lastVerifiedAt: connection.lastVerifiedAt ?? null,
      sendCountToday:
        connection.sendCountDayKey === getUtcDayKey(getCurrentUTCTimestamp())
          ? (connection.sendCountToday ?? 0)
          : 0,
    };
  },
});

export const getBrowserConnectionForUserInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (
    ctx,
    { userId }
  ): Promise<Doc<"browserConnections"> | null> => {
    return await ctx.db
      .query("browserConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const upsertBrowserConnectionInternal = internalMutation({
  args: {
    userId: v.id("users"),
    xAccountId: v.id("xAccounts"),
    kernelProfileName: v.string(),
    authConnectionId: v.string(),
    status: browserConnectionStatusValidator,
  },
  handler: async (ctx, args): Promise<Id<"browserConnections">> => {
    const now = getCurrentUTCTimestamp();
    const existing = await ctx.db
      .query("browserConnections")
      .withIndex("by_x_account", (q) => q.eq("xAccountId", args.xAccountId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        kernelProfileName: args.kernelProfileName,
        authConnectionId: args.authConnectionId,
        status: args.status,
        consecutiveFailures: 0,
        updatedAt: now,
        ...(args.status === "connected" ? { lastVerifiedAt: now } : {}),
      });
      return existing._id;
    }

    return await ctx.db.insert("browserConnections", {
      userId: args.userId,
      xAccountId: args.xAccountId,
      kernelProfileName: args.kernelProfileName,
      authConnectionId: args.authConnectionId,
      status: args.status,
      consecutiveFailures: 0,
      updatedAt: now,
      ...(args.status === "connected" ? { lastVerifiedAt: now } : {}),
    });
  },
});

export const setBrowserConnectionStatusInternal = internalMutation({
  args: {
    connectionId: v.id("browserConnections"),
    status: browserConnectionStatusValidator,
  },
  handler: async (ctx, { connectionId, status }) => {
    const now = getCurrentUTCTimestamp();
    await ctx.db.patch(connectionId, {
      status,
      updatedAt: now,
      ...(status === "connected"
        ? { lastVerifiedAt: now, consecutiveFailures: 0 }
        : {}),
    });
  },
});

/**
 * Check the daily browser-send budget and consume one send if allowed.
 * Cap and enablement come from workspaceAgentSettings when a workspace is
 * in context; otherwise a conservative default cap applies. Counters live
 * on the browser connection (per X account — the real risk boundary).
 */
export const tryConsumeBrowserSendBudgetInternal = internalMutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (
    ctx,
    { userId, workspaceId }
  ): Promise<{ allowed: boolean; reason?: string }> => {
    const connection = await ctx.db
      .query("browserConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!connection || connection.status !== "connected") {
      return {
        allowed: false,
        reason:
          connection?.status === "needs_reconnect"
            ? "Browser sending needs reconnecting."
            : "Browser sending is not connected.",
      };
    }

    let cap = DEFAULT_DAILY_BROWSER_SEND_CAP;
    if (workspaceId) {
      const settings = await ctx.db
        .query("workspaceAgentSettings")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .first();
      if (settings) {
        if (!settings.browserSendingEnabled) {
          return {
            allowed: false,
            reason: "Browser sending is turned off for this workspace.",
          };
        }
        cap = settings.dailyBrowserSendCap;
      }
    }

    const now = getCurrentUTCTimestamp();
    const dayKey = getUtcDayKey(now);
    const countToday =
      connection.sendCountDayKey === dayKey
        ? (connection.sendCountToday ?? 0)
        : 0;

    if (countToday >= cap) {
      return {
        allowed: false,
        reason: `Daily browser send limit reached (${cap}/day).`,
      };
    }

    await ctx.db.patch(connection._id, {
      sendCountDayKey: dayKey,
      sendCountToday: countToday + 1,
      updatedAt: now,
    });

    return { allowed: true };
  },
});

/**
 * Record a browser-send outcome. Failures increment the stop-loss counter;
 * hitting the threshold (or an explicit logged-out signal) pauses browser
 * sending and notifies the user to reconnect.
 */
export const recordBrowserSendOutcomeInternal = internalMutation({
  args: {
    userId: v.id("users"),
    success: v.boolean(),
    loggedOut: v.optional(v.boolean()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, { userId, success, loggedOut, workspaceId }) => {
    const connection = await ctx.db
      .query("browserConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!connection) {
      return;
    }

    const now = getCurrentUTCTimestamp();

    if (success) {
      await ctx.db.patch(connection._id, {
        consecutiveFailures: 0,
        lastVerifiedAt: now,
        updatedAt: now,
      });
      return;
    }

    const failures = (connection.consecutiveFailures ?? 0) + 1;
    const shouldPause =
      Boolean(loggedOut) || failures >= STOP_LOSS_CONSECUTIVE_FAILURES;

    await ctx.db.patch(connection._id, {
      consecutiveFailures: failures,
      updatedAt: now,
      ...(shouldPause ? { status: "needs_reconnect" as const } : {}),
    });

    if (shouldPause && connection.status !== "needs_reconnect") {
      let notifyWorkspaceId = workspaceId ?? null;
      if (!notifyWorkspaceId) {
        const workspace = await getDefaultWorkspaceForUser(ctx, userId);
        notifyWorkspaceId = workspace?._id ?? null;
      }
      if (notifyWorkspaceId) {
        await createNotification(ctx, {
          userId,
          workspaceId: notifyWorkspaceId,
          type: "error",
          title: "Browser sending needs reconnecting",
          message: loggedOut
            ? "Your X browser session is logged out. Reconnect browser sending in Settings → Connected accounts to keep the △ Agent sending."
            : "Browser sending paused after repeated failures. Reconnect it in Settings → Connected accounts.",
          targetHref: "/settings/connected-accounts",
          notificationKey: `browser-reconnect:${connection._id}`,
        });
      }
    }
  },
});
