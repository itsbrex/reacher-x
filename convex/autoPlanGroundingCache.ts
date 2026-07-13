import { v } from "convex/values";
import { internalMutation, internalQuery } from "./lib/functionBuilders";
import { getCurrentUTCTimestamp } from "../shared/lib/utils/time/timeUtils";

const autoPlanGroundingStageValidator = v.union(
  v.literal("platform_profile"),
  v.literal("recent_posts"),
  v.literal("website_research"),
  v.literal("web_research")
);

export const getAutoPlanGroundingCacheInternal = internalQuery({
  args: { prospectId: v.id("prospects") },
  handler: async (ctx, { prospectId }) => {
    return await ctx.db
      .query("autoPlanGroundingCache")
      .withIndex("by_prospect", (q) => q.eq("prospectId", prospectId))
      .first();
  },
});

export const saveAutoPlanGroundingStageInternal = internalMutation({
  args: {
    prospectId: v.id("prospects"),
    workspaceId: v.id("workspaces"),
    stage: autoPlanGroundingStageValidator,
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const now = getCurrentUTCTimestamp();
    const existing = await ctx.db
      .query("autoPlanGroundingCache")
      .withIndex("by_prospect", (q) => q.eq("prospectId", args.prospectId))
      .first();
    const stagePatch =
      args.stage === "platform_profile"
        ? {
            platformProfile: args.value,
            platformProfileCompletedAt: now,
          }
        : args.stage === "recent_posts"
          ? { recentPosts: args.value, recentPostsCompletedAt: now }
          : args.stage === "website_research"
            ? {
                websiteResearch: args.value,
                websiteResearchCompletedAt: now,
              }
            : { webResearch: args.value, webResearchCompletedAt: now };

    if (existing) {
      if (existing.workspaceId !== args.workspaceId) {
        throw new Error("Auto plan grounding cache workspace mismatch");
      }
      await ctx.db.patch(existing._id, { ...stagePatch, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("autoPlanGroundingCache", {
      prospectId: args.prospectId,
      workspaceId: args.workspaceId,
      ...stagePatch,
      updatedAt: now,
    });
  },
});
