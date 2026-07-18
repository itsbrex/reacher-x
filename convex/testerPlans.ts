import { v } from "convex/values";
import { internalMutation, internalQuery } from "./lib/functionBuilders";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getCurrentUTCTimestamp } from "../shared/lib/utils/time/timeUtils";
import { PLAN_LIMITS } from "./lib/planConstants";
import { applyPlanTransition } from "./lib/planTransitionCore";

const paidTesterTierValidator = v.union(
  v.literal("hobby"),
  v.literal("base"),
  v.literal("pro")
);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function getUserByEmailOrThrow(
  ctx: QueryCtx | MutationCtx,
  email: string
) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", normalizeEmail(email)))
    .first();

  if (!user) {
    throw new Error(`User not found for email: ${email}`);
  }

  return user;
}

export const getTesterPlanByEmail = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeEmail(args.email);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      return null;
    }

    const plan = await ctx.db
      .query("userPlans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return {
      userId: user._id,
      email: user.email,
      tier: plan?.tier ?? "free",
      prospectsLimit: plan?.prospectsLimit ?? PLAN_LIMITS.free.prospectsLimit,
      workspacesLimit:
        plan?.workspacesLimit ?? PLAN_LIMITS.free.workspacesLimit,
      externalSubscriptionId: plan?.externalSubscriptionId,
      expiresAt: plan?.expiresAt,
      updatedAt: plan?.updatedAt,
    };
  },
});

export const grantTesterPlanByEmail = internalMutation({
  args: {
    email: v.string(),
    tier: paidTesterTierValidator,
    durationDays: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    externalSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.durationDays !== undefined && args.expiresAt !== undefined) {
      throw new Error("Provide either durationDays or expiresAt, not both.");
    }

    if (args.durationDays !== undefined && args.durationDays <= 0) {
      throw new Error("durationDays must be greater than 0.");
    }

    const now = getCurrentUTCTimestamp();
    const normalizedEmail = normalizeEmail(args.email);
    const user = await getUserByEmailOrThrow(ctx, normalizedEmail);

    const resolvedExpiresAt =
      args.expiresAt ??
      (args.durationDays !== undefined
        ? now + args.durationDays * 24 * 60 * 60 * 1000
        : undefined);

    await applyPlanTransition(ctx, {
      userId: user._id,
      tier: args.tier,
      subscription: null,
      externalSubscriptionId:
        args.externalSubscriptionId ?? "tester_free_access",
      expiresAt: resolvedExpiresAt,
    });

    const plan = await ctx.db
      .query("userPlans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return {
      success: true,
      userId: user._id,
      email: user.email,
      tier: plan?.tier ?? args.tier,
      externalSubscriptionId:
        plan?.externalSubscriptionId ?? "tester_free_access",
      expiresAt: plan?.expiresAt,
      updatedAt: plan?.updatedAt ?? now,
    };
  },
});

export const revokeTesterPlanByEmail = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const now = getCurrentUTCTimestamp();
    const normalizedEmail = normalizeEmail(args.email);
    const user = await getUserByEmailOrThrow(ctx, normalizedEmail);

    await applyPlanTransition(ctx, {
      userId: user._id,
      tier: "free",
      subscription: null,
    });

    const plan = await ctx.db
      .query("userPlans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return {
      success: true,
      userId: user._id,
      email: user.email,
      tier: plan?.tier ?? "free",
      externalSubscriptionId: plan?.externalSubscriptionId,
      expiresAt: plan?.expiresAt,
      updatedAt: plan?.updatedAt ?? now,
    };
  },
});
