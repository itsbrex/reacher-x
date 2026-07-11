import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./lib/functionBuilders";
import { internal } from "./_generated/api";
import {
  fetchPublicThreadById,
  type NormalizedOrderedConfigEntry,
  fetchPublicTestimonialTweetsByIds,
  normalizeOrderedConfigEntries,
  normalizeOrderedConfigIds,
} from "./lib/publicSocialCore";
import type { Thread } from "../features/threads/types";

function asPositiveLimit(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value > 0 ? Math.floor(value) : undefined;
}

async function getPublicThreadRows(
  ctx: any,
  options?: { includeInactive?: boolean }
) {
  if (options?.includeInactive) {
    return await ctx.db
      .query("publicThreads")
      .withIndex("by_position")
      .collect();
  }

  return await ctx.db
    .query("publicThreads")
    .withIndex("by_isActive_position", (q: any) => q.eq("isActive", true))
    .collect();
}

function sortThreadsByRecency(
  left: { thread: Thread; position: number },
  right: { thread: Thread; position: number }
) {
  if (left.thread.postedAt !== right.thread.postedAt) {
    return right.thread.postedAt - left.thread.postedAt;
  }

  return left.position - right.position;
}

async function getOrderedPublicThreads(
  ctx: any,
  options?: {
    excludeThreadId?: string;
    limit?: number;
  }
): Promise<Thread[]> {
  const threadEntries = (await ctx.runQuery(
    internal.publicSocial.getPublicThreadsConfigInternal,
    {
      excludeThreadId: options?.excludeThreadId,
    }
  )) as NormalizedOrderedConfigEntry[];

  const threads = (
    await Promise.all(
      threadEntries.map(async ({ id, position }) => {
        const thread = await fetchPublicThreadById(ctx, id);
        return thread ? { thread, position } : null;
      })
    )
  )
    .filter(
      (
        entry
      ): entry is {
        thread: Thread;
        position: number;
      } => entry !== null
    )
    .sort(sortThreadsByRecency)
    .map((entry) => entry.thread);

  const limit = asPositiveLimit(options?.limit);
  return typeof limit === "number" ? threads.slice(0, limit) : threads;
}

async function getPublicTestimonialRows(
  ctx: any,
  options?: { includeInactive?: boolean }
) {
  if (options?.includeInactive) {
    return await ctx.db
      .query("publicTestimonials")
      .withIndex("by_position")
      .collect();
  }

  return await ctx.db
    .query("publicTestimonials")
    .withIndex("by_isActive_position", (q: any) => q.eq("isActive", true))
    .collect();
}

export const listPublicThreadIds = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const rows = await getPublicThreadRows(ctx, {
      includeInactive: args.includeInactive,
    });
    return normalizeOrderedConfigIds(rows, "threadId", {
      includeInactive: args.includeInactive,
    });
  },
});

export const getPublicTestimonialsConfigInternal = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = await getPublicTestimonialRows(ctx);
    return normalizeOrderedConfigIds(rows, "tweetId", {
      limit: asPositiveLimit(args.limit),
    });
  },
});

export const getPublicThreadsConfigInternal = internalQuery({
  args: {
    limit: v.optional(v.number()),
    excludeThreadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = await getPublicThreadRows(ctx);
    return normalizeOrderedConfigEntries(rows, "threadId", {
      excludeId: args.excludeThreadId,
    });
  },
});

export const getPublicThreadDetailContextInternal = internalQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await getPublicThreadRows(ctx);
    const threadIds = normalizeOrderedConfigIds(rows, "threadId");
    const index = threadIds.indexOf(args.threadId.trim());
    return {
      index,
      totalThreads: threadIds.length,
    };
  },
});

export const getPublicTestimonials = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tweetIds = (await ctx.runQuery(
      internal.publicSocial.getPublicTestimonialsConfigInternal,
      {
        limit: args.limit,
      }
    )) as string[];

    const tweets = await fetchPublicTestimonialTweetsByIds(tweetIds);

    return { tweets };
  },
});

export const getPublicThreads = action({
  args: {
    limit: v.optional(v.number()),
    excludeThreadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const threads = await getOrderedPublicThreads(ctx, {
      excludeThreadId: args.excludeThreadId,
      limit: args.limit,
    });

    return { threads };
  },
});

export const getPublicThread = action({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedThreadId = args.threadId.trim();
    const orderedThreads = await getOrderedPublicThreads(ctx);
    const index = orderedThreads.findIndex(
      (thread) => thread.threadId === normalizedThreadId
    );
    const totalThreads = orderedThreads.length;

    if (index === -1) {
      return {
        thread: null,
        threadNumber: null,
        totalThreads,
      };
    }

    const thread = orderedThreads[index] ?? null;

    return {
      thread,
      threadNumber: totalThreads - index,
      totalThreads,
    };
  },
});

export const replacePublicSocialConfigInternal = internalMutation({
  args: {
    testimonialTweetIds: v.array(v.string()),
    threadIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedThreadIds = normalizeOrderedConfigIds(
      args.threadIds.map((threadId, position) => ({
        isActive: true,
        position,
        threadId,
      })),
      "threadId"
    );
    const normalizedTestimonialIds = normalizeOrderedConfigIds(
      args.testimonialTweetIds.map((tweetId, position) => ({
        isActive: true,
        position,
        tweetId,
      })),
      "tweetId"
    );

    const [existingThreadRows, existingTestimonialRows] = await Promise.all([
      ctx.db.query("publicThreads").collect(),
      ctx.db.query("publicTestimonials").collect(),
    ]);

    await Promise.all([
      ...existingThreadRows.map((row) => ctx.db.delete(row._id)),
      ...existingTestimonialRows.map((row) => ctx.db.delete(row._id)),
    ]);

    for (const [position, threadId] of normalizedThreadIds.entries()) {
      await ctx.db.insert("publicThreads", {
        isActive: true,
        position,
        threadId,
      });
    }

    for (const [position, tweetId] of normalizedTestimonialIds.entries()) {
      await ctx.db.insert("publicTestimonials", {
        isActive: true,
        position,
        tweetId,
      });
    }

    return {
      testimonials: normalizedTestimonialIds.length,
      threads: normalizedThreadIds.length,
    };
  },
});
