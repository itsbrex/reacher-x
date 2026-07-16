"use node";

// convex/agents/tools/workspaceMemoryHelpers.ts
// Shared helpers for workspace-scoped memory tools
//
// Follows AGENT_CONTEXT three-layer architecture:
// - This module lives in the Agent Tools layer and only contains thin
//   helpers for resolving workspace/prospect context from the current thread.

import type { ToolCtx } from "@convex-dev/agent";
import { components, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { parseSetupThreadState } from "../../lib/setupThreadHelpers";
import type { ConvexWideEventLogger } from "../../lib/wideEventLogger";

export type ToolContext = ToolCtx;
type ToolContextWithPromptMessageId = ToolContext & {
  promptMessageId?: string;
};

export type WorkspaceMemoryContext = {
  userId: Id<"users"> | null;
  workspaceId: string | null;
  prospectId: string | null;
};

/**
 * The installed Agent component currently exposes the prompt message as
 * `promptMessageId` at runtime while its public ToolCtx type documents
 * `messageId`. Support both names centrally until the component aligns them.
 */
export function getToolPromptMessageId(ctx: ToolContext): string | undefined {
  return (
    ctx.messageId ?? (ctx as ToolContextWithPromptMessageId).promptMessageId
  );
}

/**
 * Resolve the current workspace + optional prospect context for a thread.
 *
 * Resolution order:
 * 1. Prospect threads via prospectThreads.getThreadProspectContext
 * 2. Setup sessions via setupSessions.getByThreadIdInternal
 * 3. Setup thread titles via parseSetupThreadState("setup:{workspaceId}")
 * 4. Default workspace for the current user
 */
export async function resolveWorkspaceMemoryContext(
  ctx: ToolContext,
  moduleName: string,
  logEvent?: ConvexWideEventLogger | null
): Promise<WorkspaceMemoryContext> {
  const userId =
    typeof ctx.userId === "string" ? (ctx.userId as Id<"users">) : null;
  const threadId = ctx.threadId ?? null;

  if (!userId) {
    logEvent?.warn("Missing userId in tool context", {
      agent_tool: {
        module: moduleName,
      },
    });
    return { userId: null, workspaceId: null, prospectId: null };
  }

  let workspaceId: string | null = null;
  let prospectId: string | null = null;

  // 1) Outreach / prospect threads
  if (threadId) {
    try {
      const threadContext = await ctx.runQuery(
        internal.prospectThreads.getThreadProspectContext,
        { threadId }
      );

      if (threadContext?.workspaceId && threadContext?.prospectId) {
        workspaceId = String(threadContext.workspaceId);
        prospectId = String(threadContext.prospectId);
      }
    } catch {
      logEvent?.warn("Failed to resolve prospect thread context", {
        agent_tool: {
          module: moduleName,
        },
      });
    }
  }

  // 2) Setup sessions (setup agent threads)
  if (!workspaceId && threadId) {
    try {
      const session = await ctx.runQuery(
        internal.setupSessions.getByThreadIdInternal,
        { threadId }
      );

      if (session) {
        const sessionWorkspaceId =
          session.targetWorkspaceId ?? session.existingWorkspaceId;
        if (sessionWorkspaceId) {
          workspaceId = String(sessionWorkspaceId);
        }
      }
    } catch {
      logEvent?.warn("Failed to resolve setup session by thread", {
        agent_tool: {
          module: moduleName,
        },
      });
    }
  }

  // 3) Canonical workspace-thread links for `/agent` history + scoping
  if (!workspaceId && threadId) {
    try {
      const threadContext = await ctx.runQuery(
        internal.workspaceThreads.getThreadWorkspaceContext,
        { threadId }
      );

      if (threadContext?.workspaceId) {
        workspaceId = String(threadContext.workspaceId);
      }
    } catch {
      logEvent?.warn("Failed to resolve workspace thread context", {
        agent_tool: {
          module: moduleName,
        },
      });
    }
  }

  // 4) Setup thread titles using the "setup:{workspaceId}" convention
  if (!workspaceId && threadId) {
    try {
      const thread = await ctx.runQuery(components.agent.threads.getThread, {
        threadId,
      });

      const parsed = parseSetupThreadState(thread?.title);
      if (parsed && parsed.kind === "workspace" && parsed.workspaceId) {
        workspaceId = parsed.workspaceId;
      }
    } catch {
      logEvent?.warn("Failed to parse setup thread state for workspace", {
        agent_tool: {
          module: moduleName,
        },
      });
    }
  }

  // 5) Fallback to default workspace for user
  if (!workspaceId) {
    try {
      const workspace = await ctx.runQuery(
        internal.workspaces.getDefaultWorkspaceInternal,
        { userId }
      );
      if (workspace?._id) {
        workspaceId = String(workspace._id);
      }
    } catch {
      logEvent?.warn("Failed to resolve default workspace for user", {
        agent_tool: {
          module: moduleName,
        },
        user: {
          id: userId,
        },
      });
    }
  }

  return { userId, workspaceId, prospectId };
}
