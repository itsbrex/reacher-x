import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { upsertAgentThreadTargetSelection } from "./lib/agentThreadTargetSelectionHelpers";
import { createPlanBatchReferenceKey } from "./lib/planBatchCore";

export const migrations = new Migrations<DataModel>(components.migrations);

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
