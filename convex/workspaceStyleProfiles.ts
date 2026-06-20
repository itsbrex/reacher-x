import { v } from "convex/values";
import { internalMutation, internalQuery } from "./lib/functionBuilders";
import { buildChangedPatch } from "./lib/patchHelpers";
import {
  getWorkspaceStyleProfileRow,
  upsertWorkspaceStyleProfileOnDb,
} from "./lib/workspaceStyleProfileCore";
import {
  prospectPlatformValidator,
  styleProfileStatusValidator,
} from "./validators";

export const getWorkspaceStyleProfile = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
    platform: prospectPlatformValidator,
  },
  handler: async (ctx, args) => {
    return await getWorkspaceStyleProfileRow(ctx.db, args);
  },
});

export const listWorkspaceStyleProfiles = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workspaceStyleProfiles")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

export const upsertWorkspaceStyleProfile = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    platform: prospectPlatformValidator,
    status: styleProfileStatusValidator,
    version: v.number(),
    sourceKey: v.optional(v.string()),
    sourceVersion: v.optional(v.number()),
    sourceExternalUserId: v.optional(v.string()),
    lastAnalyzedAt: v.optional(v.number()),
    sampleCount: v.number(),
    editDiffCount: v.number(),
    promotedMemoryId: v.optional(v.string()),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await upsertWorkspaceStyleProfileOnDb(ctx.db, args);
  },
});

export const patchWorkspaceStyleProfile = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    platform: prospectPlatformValidator,
    patch: v.object({
      status: v.optional(styleProfileStatusValidator),
      version: v.optional(v.number()),
      sourceKey: v.optional(v.string()),
      sourceVersion: v.optional(v.number()),
      sourceExternalUserId: v.optional(v.string()),
      lastAnalyzedAt: v.optional(v.number()),
      sampleCount: v.optional(v.number()),
      editDiffCount: v.optional(v.number()),
      promotedMemoryId: v.optional(v.string()),
      lastError: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("workspaceStyleProfiles")
      .withIndex("by_workspace_platform", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("platform", args.platform)
      )
      .first();

    if (!existing) {
      return null;
    }

    const patch = buildChangedPatch(
      existing as unknown as Record<string, unknown>,
      args.patch
    );
    if (!patch) {
      return existing._id;
    }

    await ctx.db.patch(existing._id, patch);
    return existing._id;
  },
});
