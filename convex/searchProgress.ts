import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getActiveByKeyword = query({
  args: { keywordKey: v.string() },
  handler: async (ctx, { keywordKey }) => {
    // Return the most recent non-complete progress for this keyword (any operation)
    const latestActive = await ctx.db
      .query("search_progress")
      .withIndex("by_keyword", (q) => q.eq("keywordKey", keywordKey))
      .order("desc")
      .filter((q) => q.eq(q.field("isComplete"), false))
      .first();

    if (latestActive) return latestActive;

    // Fallback to latest (may be complete) so the client can decide to hide
    return await ctx.db
      .query("search_progress")
      .withIndex("by_keyword", (q) => q.eq("keywordKey", keywordKey))
      .order("desc")
      .first();
  },
});

export const upsertProgress = mutation({
  args: {
    keywordKey: v.string(),
    operation: v.union(v.literal("initial"), v.literal("loadMore")),
    phase: v.union(
      v.literal("queued"),
      v.literal("searching"),
      v.literal("filtering"),
      v.literal("finalizing"),
      v.literal("complete")
    ),
    value: v.number(),
  },
  handler: async (ctx, args) => {
    const { keywordKey, operation, phase, value } = args;
    const now = Date.now();
    const existing = await ctx.db
      .query("search_progress")
      .withIndex("by_keyword_operation", (q) =>
        q.eq("keywordKey", keywordKey).eq("operation", operation)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        phase,
        value,
        isComplete: phase === "complete",
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("search_progress", {
      keywordKey,
      operation,
      phase,
      value,
      isComplete: phase === "complete",
      updatedAt: now,
    });
  },
});

export const completeProgress = mutation({
  args: {
    keywordKey: v.string(),
    operation: v.union(v.literal("initial"), v.literal("loadMore")),
  },
  handler: async (ctx, { keywordKey, operation }) => {
    const existing = await ctx.db
      .query("search_progress")
      .withIndex("by_keyword_operation", (q) =>
        q.eq("keywordKey", keywordKey).eq("operation", operation)
      )
      .first();
    if (!existing) return;
    await ctx.db.patch(existing._id, {
      phase: "complete",
      value: 100,
      isComplete: true,
      updatedAt: Date.now(),
    });
  },
});
