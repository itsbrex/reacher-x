// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { tweetValidator } from "./validators";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  socialAccounts: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    providerAccountId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  }).index("by_user_provider", ["userId", "provider"]),
  waitlist: defineTable({
    email: v.string(),
    twitter: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_email", ["email"]),
  threads: defineTable({
    threadId: v.string(),
    createdAt: v.number(),
    tweets: v.array(tweetValidator),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_threadId", ["threadId"]),
});
