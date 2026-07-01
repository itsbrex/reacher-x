"use node";

import { v } from "convex/values";
import { internalAction } from "./lib/functionBuilders";
import { internal } from "./_generated/api";
import { getXConnectionStatusForUser } from "./lib/xdkAuth";
import type { EffectivePostTextLimit } from "../shared/lib/twitter/xPostTextLimit";

const effectivePostTextLimitValidator = v.union(
  v.object({ mode: v.literal("short"), maxWeighted: v.number() }),
  v.object({ mode: v.literal("long"), maxChars: v.number() })
);

export const getEffectivePostLimitWithRefreshInternal = internalAction({
  args: {
    userId: v.id("users"),
  },
  returns: effectivePostTextLimitValidator,
  handler: async (ctx, { userId }): Promise<EffectivePostTextLimit> => {
    await getXConnectionStatusForUser(ctx, internal.xStore, userId);
    return await ctx.runQuery(
      internal.xPostLimits.getEffectivePostLimitInternal,
      {
        userId,
      }
    );
  },
});
