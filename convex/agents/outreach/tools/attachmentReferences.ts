"use node";

import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import {
  resolveAgentAttachmentMediaInput,
  type AgentAttachmentMediaInput,
  type ResolvedAgentAttachmentMediaInput,
} from "../../../lib/agentAttachmentReferenceCore";
import { getToolPromptMessageId } from "../../tools/workspaceMemoryHelpers";
import type { ToolContext } from "./helpers";

export const attachmentRefsSchema = z
  .array(z.string().regex(/^attachment_[1-9]\d*$/))
  .max(4)
  .optional()
  .describe(
    "Application-issued attachment references from hidden context, such as attachment_1. Use these for files the user selected; never provide storage URLs or upload IDs."
  );

export type ToolAttachmentMediaInput = AgentAttachmentMediaInput;

async function loadToolAttachmentReferences(ctx: ToolContext) {
  const userId =
    typeof ctx.userId === "string" ? (ctx.userId as Id<"users">) : null;
  const threadId = ctx.threadId;
  const messageId = getToolPromptMessageId(ctx);
  if (!userId || !threadId || !messageId) {
    throw new Error(
      "Selected attachments could not be resolved from this Agent turn. Re-select the files and try again."
    );
  }

  const references = await ctx.runQuery(
    internal.agentAttachments.listAvailableForAgentTool,
    {
      threadId,
      messageId,
      userId,
    }
  );
  return references;
}

export async function resolveToolAttachmentMediaInput(
  ctx: ToolContext,
  input: ToolAttachmentMediaInput
): Promise<ResolvedAgentAttachmentMediaInput> {
  const references = input.attachmentRefs?.length
    ? await loadToolAttachmentReferences(ctx)
    : [];
  return resolveAgentAttachmentMediaInput(input, references);
}

export async function resolveTaskAttachmentReferences<
  Task extends AgentAttachmentMediaInput,
>(
  ctx: ToolContext,
  tasks: Task[]
): Promise<
  Array<Omit<Task, "attachmentRefs"> & ResolvedAgentAttachmentMediaInput>
> {
  const references = tasks.some((task) => task.attachmentRefs?.length)
    ? await loadToolAttachmentReferences(ctx)
    : [];

  return tasks.map((task) => {
    const { attachmentRefs: _attachmentRefs, ...taskWithoutReferences } = task;
    return {
      ...taskWithoutReferences,
      ...resolveAgentAttachmentMediaInput(task, references),
    };
  });
}
