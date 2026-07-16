import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { getCurrentUTCTimestamp } from "../../shared/lib/utils/time/timeUtils";

export const MAX_AGENT_THREAD_TARGETS = 50;

type TaggedEntity = Doc<"agentMessageContexts">["taggedEntities"][number];

export type AgentThreadTargetCandidate = {
  prospectId: string;
  label: string;
  handle?: string;
};

function getTaggedEntityProspectId(entity: TaggedEntity): string | null {
  const rawProspectId =
    entity.prospectId ??
    (entity.kind === "prospect" ? entity.entityId : undefined);
  return rawProspectId?.trim() || null;
}

export function collectAgentThreadTargetCandidates(args: {
  workspaceId: string;
  taggedEntities: TaggedEntity[];
}): AgentThreadTargetCandidate[] {
  const candidateByProspectId = new Map<string, AgentThreadTargetCandidate>();

  for (const entity of args.taggedEntities) {
    if (entity.workspaceId && entity.workspaceId !== args.workspaceId) {
      continue;
    }
    const prospectId = getTaggedEntityProspectId(entity);
    if (!prospectId || candidateByProspectId.has(prospectId)) {
      continue;
    }
    candidateByProspectId.set(prospectId, {
      prospectId,
      label: entity.label,
      ...(entity.handle ? { handle: entity.handle } : {}),
    });
  }

  if (candidateByProspectId.size > MAX_AGENT_THREAD_TARGETS) {
    throw new Error(
      `You can tag up to ${MAX_AGENT_THREAD_TARGETS} prospects at once. Use all prospects or a filter for larger groups.`
    );
  }
  return [...candidateByProspectId.values()];
}

export async function upsertAgentThreadTargetSelection(
  ctx: Pick<MutationCtx, "db">,
  args: {
    threadId: string;
    userId: Id<"users">;
    workspaceId: Id<"workspaces">;
    sourceMessageId: string;
    sourceContextCreatedAt: number;
    taggedEntities: TaggedEntity[];
  }
): Promise<Id<"agentThreadTargetSelections"> | null> {
  const hasExplicitTargetTag = args.taggedEntities.some(
    (entity) => getTaggedEntityProspectId(entity) !== null
  );
  if (!hasExplicitTargetTag) {
    return null;
  }

  const candidates = collectAgentThreadTargetCandidates({
    workspaceId: String(args.workspaceId),
    taggedEntities: args.taggedEntities,
  });

  const validatedTargets: Array<{
    prospectId: Id<"prospects">;
    label: string;
    handle?: string;
  }> = [];
  for (const candidate of candidates) {
    const prospectId = ctx.db.normalizeId("prospects", candidate.prospectId);
    if (!prospectId) {
      continue;
    }
    const prospect = await ctx.db.get("prospects", prospectId);
    if (
      prospect &&
      prospect.workspaceId === args.workspaceId &&
      prospect.userId === args.userId
    ) {
      validatedTargets.push({
        prospectId,
        label: candidate.label,
        ...(candidate.handle ? { handle: candidate.handle } : {}),
      });
    }
  }

  const existing = await ctx.db
    .query("agentThreadTargetSelections")
    .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
    .unique();
  if (
    existing &&
    existing.sourceContextCreatedAt > args.sourceContextCreatedAt
  ) {
    return existing._id;
  }

  if (validatedTargets.length === 0) {
    if (existing) {
      await ctx.db.delete("agentThreadTargetSelections", existing._id);
    }
    return null;
  }

  const now = getCurrentUTCTimestamp();
  if (existing) {
    await ctx.db.patch("agentThreadTargetSelections", existing._id, {
      userId: args.userId,
      workspaceId: args.workspaceId,
      sourceMessageId: args.sourceMessageId,
      sourceContextCreatedAt: args.sourceContextCreatedAt,
      targets: validatedTargets,
      updatedAt: now,
    });
    return existing._id;
  }

  return await ctx.db.insert("agentThreadTargetSelections", {
    threadId: args.threadId,
    userId: args.userId,
    workspaceId: args.workspaceId,
    sourceMessageId: args.sourceMessageId,
    sourceContextCreatedAt: args.sourceContextCreatedAt,
    targets: validatedTargets,
    createdAt: now,
    updatedAt: now,
  });
}

export async function consumeAgentThreadTargetSelection(
  ctx: Pick<MutationCtx, "db">,
  args: {
    threadId: string;
    userId: Id<"users">;
    workspaceId: Id<"workspaces">;
    sourceMessageId: string;
  }
): Promise<boolean> {
  const selection = await ctx.db
    .query("agentThreadTargetSelections")
    .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
    .unique();
  if (
    !selection ||
    selection.userId !== args.userId ||
    selection.workspaceId !== args.workspaceId ||
    selection.sourceMessageId !== args.sourceMessageId
  ) {
    return false;
  }

  await ctx.db.delete("agentThreadTargetSelections", selection._id);
  return true;
}
