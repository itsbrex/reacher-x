import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { PlanTier } from "./planConstants";
import type { PolarSubscriptionLike } from "./planCycleUtils";
import { upgradePlan } from "./planCore";
import { reconcilePlanUsageForUser } from "./planUsageCore";
import { scheduleWorkspaceCapacityReconciliationForUser } from "./workspaceCapacityCore";

/**
 * Canonical trusted plan transition. Callers must establish billing or admin
 * authorization before invoking this helper.
 */
export async function applyPlanTransition(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    tier: PlanTier;
    subscription: PolarSubscriptionLike;
    externalSubscriptionId?: string;
    expiresAt?: number;
    polarCustomerId?: string;
  }
) {
  await upgradePlan(
    ctx,
    args.userId,
    args.tier,
    args.externalSubscriptionId,
    args.expiresAt,
    args.polarCustomerId
  );

  await reconcilePlanUsageForUser(ctx, {
    userId: args.userId,
    subscription: args.subscription,
  });

  await ctx.runMutation(
    internal.workspaces.reconcileWorkspaceEntitlementsForUserInternal,
    { userId: args.userId }
  );

  await scheduleWorkspaceCapacityReconciliationForUser(ctx, args.userId);
}
