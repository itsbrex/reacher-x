// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  waitlist: defineTable({
    email: v.string(),
    twitter: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_email", ["email"]), // Index for efficient email queries
  threads: defineTable({
    threadId: v.string(),
    createdAt: v.number(), // Timestamp of the first tweet's creation in milliseconds
  }).index("by_createdAt", ["createdAt"]), // Index for sorting efficiency
});
