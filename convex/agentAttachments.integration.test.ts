/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import { createOutreachPlan } from "./lib/outreachCore";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedProspect(t: ReturnType<typeof convexTest>, suffix: string) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      workosUserId: `workos-${suffix}`,
      email: `${suffix}@example.com`,
    });
    const workspaceId = await ctx.db.insert("workspaces", {
      userId,
      name: `Workspace ${suffix}`,
      description: "Attachment reference tests",
      isDefault: true,
      updatedAt: 1,
    });
    const prospectId = await ctx.db.insert("prospects", {
      workspaceId,
      userId,
      platform: "twitter",
      origin: "workspace_discovery",
      externalId: `external-${suffix}`,
      data: {},
      status: "new",
      qualificationStatus: "qualified",
      displayName: `Prospect ${suffix}`,
      updatedAt: 1,
    });
    return { userId, workspaceId, prospectId };
  });
}

describe("prospect Agent attachment references", () => {
  test("keeps recent selected attachments available on follow-up turns", async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedProspect(t, "follow-up");
    const threadId = "prospect-attachment-thread";
    const { videoUploadId, imageUploadId } = await t.run(async (ctx) => {
      const videoStorageId = await ctx.storage.store(
        new Blob(["video"], { type: "video/mp4" })
      );
      const imageStorageId = await ctx.storage.store(
        new Blob(["image"], { type: "image/png" })
      );
      const videoUploadId = await ctx.db.insert("mediaUploads", {
        storageId: videoStorageId,
        userId: seeded.userId,
        workspaceId: seeded.workspaceId,
        fileName: "demo.mp4",
        mimeType: "video/mp4",
        size: 5,
        uploadedAt: 1,
      });
      const imageUploadId = await ctx.db.insert("mediaUploads", {
        storageId: imageStorageId,
        userId: seeded.userId,
        workspaceId: seeded.workspaceId,
        fileName: "screenshot.png",
        mimeType: "image/png",
        size: 5,
        uploadedAt: 2,
      });

      await ctx.db.insert("agentMessageContexts", {
        threadId,
        messageId: "attachment-message",
        userId: seeded.userId,
        workspaceId: seeded.workspaceId,
        prospectId: seeded.prospectId,
        promptTextSource: "user",
        taggedEntities: [],
        attachments: [
          {
            uploadId: String(videoUploadId),
            fileName: "demo.mp4",
          },
        ],
        createdAt: 1,
      });
      await ctx.db.insert("agentMessageContexts", {
        threadId,
        messageId: "follow-up-message",
        userId: seeded.userId,
        workspaceId: seeded.workspaceId,
        prospectId: seeded.prospectId,
        promptTextSource: "user",
        taggedEntities: [],
        attachments: [],
        createdAt: 2,
      });

      return { videoUploadId, imageUploadId };
    });

    const followUpReferences = await t.query(
      internal.agentAttachments.listAvailableForAgentTool,
      {
        threadId,
        messageId: "follow-up-message",
        userId: seeded.userId,
      }
    );
    expect(followUpReferences).toMatchObject([
      {
        reference: "attachment_1",
        uploadId: videoUploadId,
        fileName: "demo.mp4",
        mediaKind: "video",
        selectedInCurrentMessage: false,
      },
    ]);

    await t.run(async (ctx) => {
      await ctx.db.insert("agentMessageContexts", {
        threadId,
        messageId: "new-attachment-message",
        userId: seeded.userId,
        workspaceId: seeded.workspaceId,
        prospectId: seeded.prospectId,
        promptTextSource: "user",
        taggedEntities: [],
        attachments: [
          {
            uploadId: String(imageUploadId),
            fileName: "screenshot.png",
          },
        ],
        createdAt: 3,
      });
    });

    const currentReferences = await t.query(
      internal.agentAttachments.listAvailableForAgentTool,
      {
        threadId,
        messageId: "new-attachment-message",
        userId: seeded.userId,
      }
    );
    expect(currentReferences).toMatchObject([
      {
        reference: "attachment_1",
        uploadId: imageUploadId,
        mediaKind: "image",
        selectedInCurrentMessage: true,
      },
      {
        reference: "attachment_2",
        uploadId: videoUploadId,
        mediaKind: "video",
        selectedInCurrentMessage: false,
      },
    ]);
  });

  test("persists backend-resolved upload ids during plan refinement", async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedProspect(t, "plan-update");
    const { planId, uploadId, mediaUrl } = await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(
        new Blob(["video"], { type: "video/mp4" })
      );
      const uploadId = await ctx.db.insert("mediaUploads", {
        storageId,
        userId: seeded.userId,
        workspaceId: seeded.workspaceId,
        fileName: "demo.mp4",
        mimeType: "video/mp4",
        size: 5,
        uploadedAt: 1,
      });
      const mediaUrl = await ctx.storage.getUrl(storageId);
      if (!mediaUrl) {
        throw new Error("Test media URL was not created.");
      }
      const planId = await createOutreachPlan(ctx, {
        prospectId: seeded.prospectId,
        workspaceId: seeded.workspaceId,
        userId: seeded.userId,
        strategy: {
          rationale: "Start with a concise DM.",
          valueProposition: "Relevant demo",
          tone: "helpful peer",
        },
        tasks: [
          {
            type: "dm",
            description: "Send the introduction",
            timing: { type: "immediate" },
            content: "Quick introduction",
          },
        ],
      });
      return { planId, uploadId, mediaUrl };
    });

    await t.mutation(internal.outreach.updatePlan, {
      planId,
      tasks: [
        {
          type: "dm",
          description: "Send the introduction with the demo",
          timing: { type: "immediate" },
          content: "Quick introduction",
          mediaUrls: [mediaUrl],
          mediaUploadIds: [uploadId],
          mediaDescriptions: ["Product demo"],
          mediaKinds: ["video"],
        },
      ],
    });

    const updated = await t.query(internal.outreach.getPlanInternal, {
      planId,
    });
    expect(updated?.tasks[0]).toMatchObject({
      mediaUrls: [mediaUrl],
      mediaUploadIds: [uploadId],
      mediaDescriptions: ["Product demo"],
      mediaKinds: ["video"],
    });
  });
});
