import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function scheduleWorkspaceCapacityReconciliationForUser(
  ctx: MutationCtx,
  userId: Id<"users">
) {
  const workspaces = await ctx.db
    .query("workspaces")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .collect();

  await Promise.all(
    workspaces.map((workspace) =>
      ctx.scheduler.runAfter(
        0,
        internal.workspaces.reconcileWorkspaceCapacityStateInternal,
        { workspaceId: workspace._id }
      )
    )
  );
}
