import { mutation, query } from "./lib/functionBuilders";
import { v } from "convex/values";
import { getCurrentUTCTimestamp } from "../shared/lib/utils/time/timeUtils";
import { getUserByIdentity } from "./lib/accessHelpers";

/**
 * Generate an upload URL for direct file upload to Convex storage
 * This bypasses the 5MB argument size limit for large files
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const storeMediaMetadata = mutation({
  args: {
    mediaId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    workspaceId: v.optional(v.id("workspaces")),
    displayName: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const user = await getUserByIdentity(ctx, identity);
    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.insert("mediaUploads", {
      storageId: args.mediaId,
      userId: user._id,
      workspaceId: args.workspaceId,
      fileName: args.fileName,
      displayName: args.displayName?.trim() || args.fileName,
      mimeType: args.mimeType,
      size: args.size,
      tags: args.tags?.map((tag) => tag.trim()).filter(Boolean),
      uploadedAt: getCurrentUTCTimestamp(),
    });
  },
});

/**
 * List the current user's media library (most recent first).
 * Powers attachment reuse in chat and composers.
 */
export const listMediaLibrary = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await getUserByIdentity(ctx, identity);
    if (!user) return [];

    const limit = Math.min(Math.max(args.limit ?? 30, 1), 100);
    const uploads = await ctx.db
      .query("mediaUploads")
      .withIndex("by_user_uploaded_at", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    const scoped = args.workspaceId
      ? uploads.filter(
          (upload) =>
            !upload.workspaceId || upload.workspaceId === args.workspaceId
        )
      : uploads;

    return await Promise.all(
      scoped.map(async (upload) => ({
        uploadId: upload._id,
        fileName: upload.fileName,
        displayName: upload.displayName ?? upload.fileName,
        mimeType: upload.mimeType,
        size: upload.size,
        tags: upload.tags ?? [],
        uploadedAt: upload.uploadedAt,
        mediaUrl: await ctx.storage.getUrl(upload.storageId),
      }))
    );
  },
});

export const getMediaUrl = query({
  args: { mediaId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.mediaId);
  },
});

export const deleteMedia = mutation({
  args: { uploadId: v.id("mediaUploads") },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.uploadId);
    if (!upload) return;

    // Delete from storage
    await ctx.storage.delete(upload.storageId);

    // Delete metadata
    await ctx.db.delete(args.uploadId);
  },
});
