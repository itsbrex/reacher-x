import { v } from "convex/values";
import { internalMutation, internalQuery } from "./lib/functionBuilders";
import { getCurrentUTCTimestamp } from "../shared/lib/utils/time/timeUtils";
import {
  AUTO_PLAN_RECOVERY_FAILURE_CODES,
  classifyAutoPlanFailure,
  isAutoPlanFailureRecoveryEligible,
} from "./lib/autoPlanCore";
import { resolveProspectTwitterIdentity } from "../shared/lib/twitter/prospectTwitterIdentity";
import {
  getProspectDisplayFields,
  upsertNotificationByKey,
} from "./lib/notificationHelpers";

export const markAutoPlanRunStarted = internalMutation({
  args: { runId: v.id("autoPlanRuns") },
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.status === "completed") {
      return null;
    }

    const now = getCurrentUTCTimestamp();
    await ctx.db.patch(runId, {
      status: "running",
      attemptCount: run.attemptCount + 1,
      startedAt: run.startedAt ?? now,
      updatedAt: now,
    });
    return null;
  },
});

export const attachAutoPlanWorkId = internalMutation({
  args: {
    runId: v.id("autoPlanRuns"),
    workId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { runId, workId }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.status !== "queued") {
      return null;
    }

    await ctx.db.patch(runId, {
      workId,
      updatedAt: getCurrentUTCTimestamp(),
    });
    return null;
  },
});

export const failAutoPlanRunToStart = internalMutation({
  args: {
    runId: v.id("autoPlanRuns"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { runId, errorMessage }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.status === "completed") {
      return null;
    }

    const now = getCurrentUTCTimestamp();
    const failure = classifyAutoPlanFailure(errorMessage);
    await ctx.db.patch(runId, {
      status: "failed",
      errorCode: failure.code,
      errorMessage,
      retryable: failure.retryable,
      completedAt: now,
      updatedAt: now,
    });

    const prospect = await ctx.db.get(run.prospectId);
    if (prospect) {
      await ctx.db.patch(prospect._id, {
        planGenerationStatus:
          prospect.status === "archived" ? "idle" : "failed",
        updatedAt: now,
      });
      const displayFields = getProspectDisplayFields(prospect);
      await upsertNotificationByKey(ctx, {
        userId: prospect.userId,
        workspaceId: prospect.workspaceId,
        type: "error",
        title: `Couldn’t create a plan for ${displayFields.prospectDisplayName || prospect.externalId}`,
        message: failure.userMessage,
        notificationKey: `auto-plan-failed:${prospect._id}`,
        targetHref: failure.targetHref,
        actionLabel: failure.actionLabel,
        prospectId: prospect._id,
        ...displayFields,
      });
    }
    return null;
  },
});

export const claimFailedAutoPlanRecoveryBatch = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const failedRuns = await ctx.db
      .query("autoPlanRuns")
      .withIndex("by_workspace_and_status", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "failed")
      )
      .order("desc")
      .take(Math.max(1, Math.min(args.limit * 3, 600)));
    const now = getCurrentUTCTimestamp();
    const claimed = [];
    const seenProspects = new Set<string>();

    for (const run of failedRuns) {
      if (
        claimed.length >= args.limit ||
        run.recoveryRetriedAt ||
        !isAutoPlanFailureRecoveryEligible(run.errorCode) ||
        seenProspects.has(String(run.prospectId))
      ) {
        continue;
      }
      seenProspects.add(String(run.prospectId));
      const prospect = await ctx.db.get(run.prospectId);
      if (
        !prospect ||
        prospect.workspaceId !== args.workspaceId ||
        prospect.planGenerationStatus !== "failed"
      ) {
        continue;
      }
      await ctx.db.patch(run._id, { recoveryRetriedAt: now, updatedAt: now });
      claimed.push({
        sourceRunId: run._id,
        prospectId: prospect._id,
        workspaceId: prospect.workspaceId,
        userId: prospect.userId,
      });
    }

    return claimed;
  },
});

export const claimFailedAutoPlanRecoveryBatchGlobal = internalMutation({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit, 100));
    const failedRuns = (
      await Promise.all(
        AUTO_PLAN_RECOVERY_FAILURE_CODES.map((errorCode) =>
          ctx.db
            .query("autoPlanRuns")
            .withIndex("by_status_error_and_recovery", (q) =>
              q
                .eq("status", "failed")
                .eq("errorCode", errorCode)
                .eq("recoveryRetriedAt", undefined)
            )
            .order("desc")
            .take(limit)
        )
      )
    )
      .flat()
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, Math.min(limit * 3, 300));
    const now = getCurrentUTCTimestamp();
    const claimed = [];
    const seenProspects = new Set<string>();

    for (const run of failedRuns) {
      if (
        claimed.length >= limit ||
        !isAutoPlanFailureRecoveryEligible(run.errorCode) ||
        seenProspects.has(String(run.prospectId))
      ) {
        continue;
      }
      seenProspects.add(String(run.prospectId));
      const prospect = await ctx.db.get(run.prospectId);
      if (!prospect || prospect.planGenerationStatus !== "failed") {
        continue;
      }
      await ctx.db.patch(run._id, { recoveryRetriedAt: now, updatedAt: now });
      claimed.push({
        sourceRunId: run._id,
        prospectId: prospect._id,
        workspaceId: prospect.workspaceId,
        userId: prospect.userId,
      });
    }

    return claimed;
  },
});

export const getAutoPlanRecoveryProbeTarget = internalQuery({
  args: {},
  handler: async (ctx) => {
    const runs = (
      await Promise.all(
        AUTO_PLAN_RECOVERY_FAILURE_CODES.map((errorCode) =>
          ctx.db
            .query("autoPlanRuns")
            .withIndex("by_status_error_and_recovery", (q) =>
              q
                .eq("status", "failed")
                .eq("errorCode", errorCode)
                .eq("recoveryRetriedAt", undefined)
            )
            .order("desc")
            .take(25)
        )
      )
    )
      .flat()
      .sort((left, right) => right.updatedAt - left.updatedAt);

    for (const run of runs) {
      const prospect = await ctx.db.get(run.prospectId);
      if (!prospect || prospect.planGenerationStatus !== "failed") {
        continue;
      }
      if (prospect.platform !== "twitter") {
        continue;
      }
      const identity = resolveProspectTwitterIdentity(prospect);
      if (!identity.username && !identity.userId) {
        continue;
      }
      return {
        prospectId: prospect._id,
        workspaceId: prospect.workspaceId,
        userId: prospect.userId,
      };
    }

    return null;
  },
});

export const releaseFailedAutoPlanRecoveryClaim = internalMutation({
  args: { runId: v.id("autoPlanRuns") },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.status !== "failed") {
      return null;
    }
    await ctx.db.patch(runId, {
      recoveryRetriedAt: undefined,
      updatedAt: getCurrentUTCTimestamp(),
    });
    return null;
  },
});
