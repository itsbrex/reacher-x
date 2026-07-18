import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { upsertAgentThreadTargetSelection } from "./lib/agentThreadTargetSelectionHelpers";
import { createPlanBatchReferenceKey } from "./lib/planBatchCore";
import { buildAutoPlanFailureNotificationTitle } from "./lib/autoPlanCore";
import {
  getProspectDisplayLabel,
  getProspectIdentitySnapshot,
} from "./lib/prospectIdentityCore";

export const migrations = new Migrations<DataModel>(components.migrations);

const IDENTITY_REPAIR_OWNER_EMAIL = "creativecoder.crco@gmail.com";
const IDENTITY_REPAIR_ACTIVE_WORKSPACES: Readonly<Record<string, string>> = {
  ks76np202xg61bj94838cpszyn8arxc6: "AgentMail (lead gen)",
  ks76wdkah15gxj05hatyk5hxjx88y6dj: "ReacherX (lead gen)",
};

/**
 * Production repair guard: only the explicitly approved, currently running
 * workspaces may be changed. Pausing either workspace stops subsequent writes.
 */
async function isScopedActiveIdentityRepairWorkspace(
  ctx: Pick<MutationCtx, "db">,
  workspaceId: Id<"workspaces">
): Promise<boolean> {
  const expectedName = IDENTITY_REPAIR_ACTIVE_WORKSPACES[String(workspaceId)];
  if (!expectedName) {
    return false;
  }

  const workspace = await ctx.db.get("workspaces", workspaceId);
  if (
    !workspace ||
    workspace.name !== expectedName ||
    workspace.prospectingWorkflowStatus !== "running"
  ) {
    return false;
  }

  const owner = await ctx.db.get("users", workspace.userId);
  return owner?.email.toLowerCase() === IDENTITY_REPAIR_OWNER_EMAIL;
}

export const backfillAgentThreadTargetSelections = migrations.define({
  table: "agentMessageContexts",
  batchSize: 25,
  migrateOne: async (ctx, context) => {
    if (!context.workspaceId || context.taggedEntities.length === 0) {
      return;
    }

    await upsertAgentThreadTargetSelection(ctx, {
      threadId: context.threadId,
      userId: context.userId,
      workspaceId: context.workspaceId,
      sourceMessageId: context.messageId,
      sourceContextCreatedAt: context.createdAt,
      taggedEntities: context.taggedEntities,
    });
  },
});

export const backfillPlanBatchReferenceKeys = migrations.define({
  table: "planBatchRuns",
  batchSize: 25,
  migrateOne: async (ctx, run) => {
    if (run.referenceKey) {
      return;
    }
    await ctx.db.patch("planBatchRuns", run._id, {
      referenceKey: createPlanBatchReferenceKey(),
    });
  },
});

export const backfillProspectDisplayNames = migrations.define({
  table: "prospects",
  batchSize: 25,
  migrateOne: async (ctx, prospect) => {
    if (
      !(await isScopedActiveIdentityRepairWorkspace(ctx, prospect.workspaceId))
    ) {
      return;
    }
    if (prospect.displayName?.trim()) {
      return;
    }
    const displayName = getProspectIdentitySnapshot(prospect).displayName;
    if (!displayName) {
      return;
    }
    await ctx.db.patch("prospects", prospect._id, { displayName });
  },
});

export const repairOutreachNotificationProspectIdentity = migrations.define({
  table: "outreachNotifications",
  batchSize: 25,
  migrateOne: async (ctx, notification) => {
    if (
      !notification.prospectId ||
      !(await isScopedActiveIdentityRepairWorkspace(
        ctx,
        notification.workspaceId
      ))
    ) {
      return;
    }
    const prospect = await ctx.db.get("prospects", notification.prospectId);
    if (!prospect) {
      return;
    }
    if (prospect.workspaceId !== notification.workspaceId) {
      return;
    }

    const identity = getProspectIdentitySnapshot(prospect);
    const patch: {
      prospectAvatarUrl?: string;
      prospectDisplayName?: string;
      prospectPlatform?: typeof prospect.platform;
      prospectScreenName?: string;
      prospectType?: typeof prospect.prospectType;
      title?: string;
    } = {};

    if (
      identity.avatarUrl &&
      notification.prospectAvatarUrl !== identity.avatarUrl
    ) {
      patch.prospectAvatarUrl = identity.avatarUrl;
    }
    if (
      identity.preferredLabel &&
      notification.prospectDisplayName !== identity.preferredLabel
    ) {
      patch.prospectDisplayName = identity.preferredLabel;
    }
    if (notification.prospectPlatform !== prospect.platform) {
      patch.prospectPlatform = prospect.platform;
    }
    if (
      identity.screenName &&
      notification.prospectScreenName !== identity.screenName
    ) {
      patch.prospectScreenName = identity.screenName;
    }
    if (notification.prospectType !== prospect.prospectType) {
      patch.prospectType = prospect.prospectType;
    }
    if (notification.notificationKey?.startsWith("auto-plan-failed:")) {
      const title = buildAutoPlanFailureNotificationTitle(
        getProspectDisplayLabel(prospect)
      );
      if (notification.title !== title) {
        patch.title = title;
      }
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("outreachNotifications", notification._id, patch);
    }
  },
});

export const repairPlanBatchProspectNames = migrations.define({
  table: "planBatchItems",
  batchSize: 25,
  migrateOne: async (ctx, item) => {
    const prospect = await ctx.db.get("prospects", item.prospectId);
    if (
      !prospect ||
      !(await isScopedActiveIdentityRepairWorkspace(ctx, prospect.workspaceId))
    ) {
      return;
    }
    const prospectName = getProspectDisplayLabel(prospect);
    if (item.prospectName === prospectName) {
      return;
    }
    await ctx.db.patch("planBatchItems", item._id, { prospectName });
  },
});
