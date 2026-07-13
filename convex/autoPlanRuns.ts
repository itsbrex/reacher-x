import { v } from "convex/values";
import { internalMutation } from "./lib/functionBuilders";
import { getCurrentUTCTimestamp } from "../shared/lib/utils/time/timeUtils";
import { classifyAutoPlanFailure } from "./lib/autoPlanCore";
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
        title: `Plan needs attention — ${displayFields.prospectDisplayName || prospect.externalId}`,
        message: failure.userMessage,
        notificationKey: `auto-plan-failed:${prospect._id}`,
        targetHref:
          failure.targetHref ?? `/agent?prospectId=${String(prospect._id)}`,
        actionLabel: failure.actionLabel,
        prospectId: prospect._id,
        ...displayFields,
      });
    }
    return null;
  },
});
