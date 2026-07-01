"use node";

import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { EffectivePostTextLimit } from "../../../../shared/lib/twitter/xPostTextLimit";
import { getPostTextLimitError } from "../../../../shared/lib/twitter/xPostTextLimit";

type CommentLikeTask = {
  type: string;
  content?: string;
};

function normalizeDraftText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function getEffectivePostLimitForAgentUser(
  ctx: {
    runAction: (
      ref: any,
      args: { userId: Id<"users"> }
    ) => Promise<EffectivePostTextLimit>;
  },
  userId: Id<"users">
): Promise<EffectivePostTextLimit> {
  return await ctx.runAction(
    internal.xPostLimitsActions.getEffectivePostLimitWithRefreshInternal,
    {
      userId,
    }
  );
}

export async function getStoredXSubscriptionTypeForAgentUser(
  ctx: {
    runQuery: (
      ref: any,
      args: { userId: Id<"users"> }
    ) => Promise<{ xSubscriptionType?: string } | null>;
  },
  userId: Id<"users">
): Promise<string | undefined> {
  const account = await ctx.runQuery(
    internal.xStore.getXAccountForUserInternal,
    {
      userId,
    }
  );
  return account?.xSubscriptionType;
}

export async function repairOverLimitCommentTasks<
  T extends CommentLikeTask,
>(args: {
  ctx: {
    runAction: (
      ref: any,
      actionArgs: { userId: Id<"users"> }
    ) => Promise<EffectivePostTextLimit>;
  };
  userId: Id<"users">;
  tasks: T[];
}): Promise<{
  tasks: T[];
  limit: EffectivePostTextLimit;
}> {
  const limit = await getEffectivePostLimitForAgentUser(args.ctx, args.userId);
  const tasks = args.tasks.map((task) => {
    if (task.type !== "comment" || !task.content?.trim()) {
      return task;
    }

    const normalizedContent = normalizeDraftText(task.content);
    const error = getPostTextLimitError(normalizedContent, limit);
    if (error) {
      throw new Error(
        `${error} Regenerate the draft shorter instead of auto-shortening it.`
      );
    }

    return normalizedContent === task.content
      ? task
      : { ...task, content: normalizedContent };
  });

  return { tasks, limit };
}
