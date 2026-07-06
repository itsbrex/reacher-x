import type { ThreadDoc } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "./lib/functionBuilders";
import { logger } from "../shared/lib/logger";
import {
  ensureWorkspaceThreadLink,
  getWorkspaceThreadContextByThreadId,
  listWorkspaceThreadIdsByWorkspace,
  listWorkspaceThreadLinksByWorkspace,
  type WorkspaceThreadStatus,
} from "./lib/workspaceThreadHelpers";
import { agentComponentThreadStatusValidator } from "./validators";
import { parseSetupThreadState } from "./lib/setupThreadHelpers";

const workspaceThreadsLogger = logger.withScope("WorkspaceThreads");

export const getThreadWorkspaceContext = internalQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, { threadId }) => {
    const context = await getWorkspaceThreadContextByThreadId(ctx.db, threadId);
    if (!context) {
      return null;
    }

    return {
      threadId,
      workspaceId: context.link.workspaceId,
      userId: context.link.userId,
      workspace: context.workspace,
    };
  },
});

export const listThreadIdsForWorkspace = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, { workspaceId }) => {
    return await listWorkspaceThreadIdsByWorkspace(ctx.db, workspaceId);
  },
});

export const listThreadLinksForWorkspace = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, { workspaceId }) => {
    return await listWorkspaceThreadLinksByWorkspace(ctx.db, workspaceId);
  },
});

export const listThreadLinksPageInternal = internalQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { paginationOpts }) => {
    return await ctx.db.query("workspaceAgentThreads").paginate(paginationOpts);
  },
});

export const ensureThreadLink = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    threadId: v.string(),
    userId: v.id("users"),
    threadStatus: v.optional(agentComponentThreadStatusValidator),
    threadSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ensureWorkspaceThreadLink(ctx, args);
  },
});

export const backfillLegacyWorkspaceThreads = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(internal.users.getUserByWorkosIdInternal, {
      workosUserId: identity.subject,
    });
    if (!user) {
      throw new Error("User not found");
    }

    let cursor: string | null = null;
    let scanned = 0;
    let created = 0;
    let existing = 0;
    let updated = 0;
    let skipped = 0;
    let invalid = 0;
    let errors = 0;

    while (true) {
      const threadsPage: {
        page: Array<
          Pick<ThreadDoc, "_id" | "summary" | "title"> & {
            status?: WorkspaceThreadStatus;
          }
        >;
        continueCursor: string;
        isDone: boolean;
      } = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
        userId: user._id,
        paginationOpts: { numItems: 100, cursor },
      });

      for (const thread of threadsPage.page) {
        scanned += 1;

        const parsedState = parseSetupThreadState(thread.title);
        if (!parsedState || parsedState.kind !== "workspace") {
          skipped += 1;
          continue;
        }

        try {
          const workspace = await ctx.runQuery(internal.workspaces.getById, {
            workspaceId: parsedState.workspaceId as Id<"workspaces">,
          });

          if (!workspace || workspace.userId !== user._id) {
            invalid += 1;
            continue;
          }

          const result = await ctx.runMutation(
            internal.workspaceThreads.ensureThreadLink,
            {
              workspaceId: workspace._id,
              threadId: thread._id,
              userId: user._id,
              threadStatus:
                thread.status === "archived" ? "archived" : "active",
              threadSummary: thread.summary ?? undefined,
            }
          );

          if (result.created) {
            created += 1;
          } else {
            existing += 1;
          }
          if (result.updated) {
            updated += 1;
          }
        } catch (error) {
          errors += 1;
          workspaceThreadsLogger.warn("Failed to backfill workspace thread", {
            threadId: thread._id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (threadsPage.isDone) {
        break;
      }

      cursor = threadsPage.continueCursor;
    }

    return {
      scanned,
      created,
      existing,
      updated,
      skipped,
      invalid,
      errors,
    };
  },
});

export const backfillThreadLinkMetadataInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    let cursor: string | null = null;
    let scanned = 0;
    let updated = 0;
    let unchanged = 0;
    let missingThread = 0;

    while (true) {
      const page: {
        page: Array<{
          workspaceId: Id<"workspaces">;
          threadId: string;
          userId: Id<"users">;
        }>;
        continueCursor: string;
        isDone: boolean;
      } = await ctx.runQuery(
        internal.workspaceThreads.listThreadLinksPageInternal,
        {
          paginationOpts: {
            cursor,
            numItems: 100,
          },
        }
      );

      for (const link of page.page) {
        scanned += 1;
        const thread = await ctx.runQuery(components.agent.threads.getThread, {
          threadId: link.threadId,
        });

        if (!thread) {
          missingThread += 1;
          continue;
        }

        const result = await ctx.runMutation(
          internal.workspaceThreads.ensureThreadLink,
          {
            workspaceId: link.workspaceId,
            threadId: link.threadId,
            userId: link.userId,
            threadStatus: thread.status === "archived" ? "archived" : "active",
            threadSummary: thread.summary ?? undefined,
          }
        );

        if (result.updated) {
          updated += 1;
        } else {
          unchanged += 1;
        }
      }

      if (page.isDone) {
        break;
      }

      cursor = page.continueCursor;
    }

    return { scanned, updated, unchanged, missingThread };
  },
});
