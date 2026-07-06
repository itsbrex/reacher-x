import { getManyFrom } from "convex-helpers/server/relationships";
import type { Infer } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { logger } from "../../shared/lib/logger";
import { agentComponentThreadStatusValidator } from "../validators";

type WorkspaceThreadDb = QueryCtx["db"] | MutationCtx["db"];
const workspaceThreadHelpersLogger = logger.withScope("WorkspaceThreadHelpers");

export type WorkspaceThreadLink = Doc<"workspaceAgentThreads">;
export type WorkspaceThreadStatus = Infer<
  typeof agentComponentThreadStatusValidator
>;
export type WorkspaceThreadMetadataInput = {
  threadStatus?: WorkspaceThreadStatus;
  threadSummary?: string;
};

export type WorkspaceThreadContext = {
  link: WorkspaceThreadLink;
  workspace: Doc<"workspaces">;
};

type EnsureWorkspaceThreadLinkInput = {
  workspaceId: Id<"workspaces">;
  threadId: string;
  userId: Id<"users">;
} & WorkspaceThreadMetadataInput;

function sortLinksByNewest(
  links: WorkspaceThreadLink[]
): WorkspaceThreadLink[] {
  return [...links].sort((a, b) => b._creationTime - a._creationTime);
}

function pickCanonicalThreadLink(
  links: WorkspaceThreadLink[],
  threadId: string
): WorkspaceThreadLink | null {
  if (links.length === 0) {
    return null;
  }

  if (links.length > 1) {
    workspaceThreadHelpersLogger.error(
      "Found duplicate workspace thread links; using the newest row",
      {
        threadId,
        linkCount: links.length,
      }
    );
  }

  return sortLinksByNewest(links)[0] ?? null;
}

export async function listWorkspaceThreadLinksByWorkspace(
  db: WorkspaceThreadDb,
  workspaceId: Id<"workspaces">
): Promise<WorkspaceThreadLink[]> {
  const links = await getManyFrom(
    db,
    "workspaceAgentThreads",
    "by_workspace",
    workspaceId,
    "workspaceId"
  );
  return sortLinksByNewest(links);
}

export async function listWorkspaceThreadIdsByWorkspace(
  db: WorkspaceThreadDb,
  workspaceId: Id<"workspaces">
): Promise<string[]> {
  const links = await listWorkspaceThreadLinksByWorkspace(db, workspaceId);
  return links.map((link) => link.threadId);
}

export async function getLatestActiveWorkspaceThreadLink(
  db: WorkspaceThreadDb,
  workspaceId: Id<"workspaces">
): Promise<WorkspaceThreadLink | null> {
  const links = await listWorkspaceThreadLinksByWorkspace(db, workspaceId);
  return links.find((link) => link.threadStatus !== "archived") ?? null;
}

export async function getWorkspaceThreadLinkByThreadId(
  db: WorkspaceThreadDb,
  threadId: string
): Promise<WorkspaceThreadLink | null> {
  const links = await getManyFrom(
    db,
    "workspaceAgentThreads",
    "by_thread",
    threadId,
    "threadId"
  );
  return pickCanonicalThreadLink(links, threadId);
}

export async function listWorkspaceThreadLinksByThreadId(
  db: WorkspaceThreadDb,
  threadId: string
): Promise<WorkspaceThreadLink[]> {
  const links = await getManyFrom(
    db,
    "workspaceAgentThreads",
    "by_thread",
    threadId,
    "threadId"
  );
  return sortLinksByNewest(links);
}

export async function getWorkspaceThreadContextByThreadId(
  db: WorkspaceThreadDb,
  threadId: string
): Promise<WorkspaceThreadContext | null> {
  const link = await getWorkspaceThreadLinkByThreadId(db, threadId);
  if (!link) {
    return null;
  }

  const workspace = await db.get(link.workspaceId);
  if (!workspace) {
    workspaceThreadHelpersLogger.warn("Workspace missing for thread link", {
      workspaceId: String(link.workspaceId),
      threadId,
    });
    return null;
  }

  return { link, workspace };
}

function buildWorkspaceThreadMetadataPatch(
  existing: Pick<
    Doc<"workspaceAgentThreads">,
    "threadStatus" | "threadSummary"
  >,
  input: WorkspaceThreadMetadataInput
): Partial<
  Pick<Doc<"workspaceAgentThreads">, "threadStatus" | "threadSummary">
> {
  const patch: Partial<
    Pick<Doc<"workspaceAgentThreads">, "threadStatus" | "threadSummary">
  > = {};

  if (
    input.threadStatus !== undefined &&
    existing.threadStatus !== input.threadStatus
  ) {
    patch.threadStatus = input.threadStatus;
  }

  if (
    input.threadSummary !== undefined &&
    existing.threadSummary !== input.threadSummary
  ) {
    patch.threadSummary = input.threadSummary;
  }

  return patch;
}

export async function ensureWorkspaceThreadLink(
  ctx: MutationCtx,
  input: EnsureWorkspaceThreadLinkInput
): Promise<{
  linkId: Id<"workspaceAgentThreads">;
  created: boolean;
  updated: boolean;
}> {
  const existingLink = await getWorkspaceThreadLinkByThreadId(
    ctx.db,
    input.threadId
  );

  if (existingLink) {
    if (
      existingLink.workspaceId !== input.workspaceId ||
      existingLink.userId !== input.userId
    ) {
      throw new Error(
        `Thread ${input.threadId} is already linked to a different workspace relationship`
      );
    }

    const patch = buildWorkspaceThreadMetadataPatch(existingLink, input);
    const updated = Object.keys(patch).length > 0;
    if (updated) {
      await ctx.db.patch(existingLink._id, patch);
    }

    return { linkId: existingLink._id, created: false, updated };
  }

  const linkId = await ctx.db.insert("workspaceAgentThreads", input);
  return { linkId, created: true, updated: false };
}
