import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getUserSocialAccounts = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;
    const userIdTyped = ctx.db.normalizeId("users", userId) as Id<"users">;
    return await ctx.db
      .query("socialAccounts")
      .withIndex("by_user_provider", (q) => q.eq("userId", userIdTyped))
      .collect();
  },
});
