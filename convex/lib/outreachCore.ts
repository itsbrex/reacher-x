// convex/lib/outreachCore.ts
// Core business logic for outreach operations
// Layer 3: Core Logic (following Three-Layer Architecture from AGENT_CONTEXT.txt)

import { Infer } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { MutationCtx, QueryCtx } from "../_generated/server";
import {
  memorySuggestionStatusValidator,
  outreachPlanSnapshotTaskValidator,
  outreachPlanSnapshotValidator,
  outreachTaskTypeValidator,
  outreachTaskTimingValidator,
  outreachTaskStatusValidator,
  outreachStrategyValidator,
  prospectActivityMetadataValidator,
  twitterActionRequestStatusValidator,
} from "../validators";
import { getCurrentUTCTimestamp } from "../../shared/lib/utils/time/timeUtils";
import { createNotification as createNotificationRecord } from "./notificationHelpers";
import { isRecord } from "./typeGuards";
import { workflow as workflowManager } from "./workflow";
import type {
  TwitterPostRef,
  TwitterPostSummary,
} from "../../shared/lib/twitter/contracts";
import {
  assertDmTextWithinLimit,
  assertPostTextWithinLimit,
  hasDmBody,
} from "../../shared/lib/twitter/xPostTextLimit";
import { getEffectivePostTextLimitForUser } from "./xPostLimits";
import { requireProspectEligibleForOutreach } from "./accessHelpers";

const LINKEDIN_DM_TEXT_MAX = 8_000;

// ============================================================================
// Constants
// ============================================================================

/** Threshold for automatic plan generation (>= 80 score) */
export const AUTO_PLAN_GENERATION_THRESHOLD = 80;

const PLAN_DELETE_ACTION_REQUEST_STATUSES: Array<
  Infer<typeof twitterActionRequestStatusValidator>
> = [
  "draft",
  "pending_approval",
  "approved",
  "executing",
  "completed",
  "failed",
  "cancelled",
];

const PLAN_DELETE_MEMORY_SUGGESTION_STATUSES: Array<
  Infer<typeof memorySuggestionStatusValidator>
> = ["pending_review", "promoted", "rejected"];

type WorkflowId = Awaited<ReturnType<typeof workflowManager.start>>;

// ============================================================================
// Types
// ============================================================================

export interface OutreachPlanInput {
  prospectId: Id<"prospects">;
  workspaceId: Id<"workspaces">;
  userId: Id<"users">;
  strategy: Infer<typeof outreachStrategyValidator>;
  tasks: OutreachTaskInput[];
  threadId?: string;
}

export interface OutreachTaskInput {
  type: Infer<typeof outreachTaskTypeValidator>;
  description: string;
  timing: Infer<typeof outreachTaskTimingValidator>;
  targetTweetId?: string;
  content?: string;
  mediaUrls?: string[];
  mediaDescriptions?: string[];
  mediaKinds?: Array<"image" | "gif" | "video">;
  approvalContext?: {
    panelMode?: "approval" | "posted";
    platform?: "twitter" | "linkedin";
    sourcePostRef?: TwitterPostRef;
    sourcePostSummary?: TwitterPostSummary;
    sourceContext?: string;
  };
}

export interface ProspectContext {
  prospect: Doc<"prospects">;
  evidencePosts: Array<{ text: string; score: number }>;
  existingPlan: Doc<"outreachPlans"> | null;
  tasks: Doc<"outreachTasks">[];
}

/** Tweet data for engagement analysis (used by social post-selection logic) */
export interface TweetDataForEngagement {
  tweetId: string;
  text: string;
  createdAt: string;
  metrics: {
    replyCount: number;
    likeCount: number;
    retweetCount: number;
  };
  isReply: boolean;
  inReplyToScreenName?: string;
}

/** Result shape for normalized engagement candidate analysis */
export interface AnalyzeBestEngagementResult {
  success: boolean;
  prospectName: string;
  prospectBio?: string;
  tweets: TweetDataForEngagement[];
  error?: string;
}

/** Result from askHuman tool - indicates workflow should pause */
export interface AskHumanResult {
  pending: true;
  message: string;
  question: string;
  context?: string;
  urgency: "low" | "medium" | "high";
  options?: string[];
}

export type OutreachPlanSnapshotTask = Infer<
  typeof outreachPlanSnapshotTaskValidator
>;
export type OutreachPlanSnapshot = Infer<typeof outreachPlanSnapshotValidator>;

// ============================================================================
// Task Validation
// ============================================================================

/**
 * Validates task inputs before creating/updating tasks.
 * Comment tasks require targetTweetId and at least one of text/media.
 */
async function validateTaskInputs(
  ctx: MutationCtx,
  userId: Id<"users">,
  tasks: OutreachTaskInput[]
): Promise<void> {
  const limit = await getEffectivePostTextLimitForUser(ctx, userId);
  const canDeferCommentTarget = tasks.some(
    (task) =>
      task.type === "wait" &&
      task.timing.type === "event" &&
      task.timing.value === "next_post"
  );
  for (const task of tasks) {
    const trimmedContent = task.content?.trim() ?? "";
    const mediaUrls =
      task.mediaUrls?.filter(
        (mediaUrl): mediaUrl is string =>
          typeof mediaUrl === "string" && mediaUrl.trim().length > 0
      ) ?? [];

    if (task.type === "comment") {
      if (!trimmedContent && mediaUrls.length === 0) {
        throw new Error(
          `Comment task "${task.description}" requires reply text or media`
        );
      }
      if (!task.targetTweetId && !canDeferCommentTarget) {
        throw new Error(
          `Comment task "${task.description}" requires targetTweetId unless the plan explicitly waits for the prospect's next post`
        );
      }
      if (trimmedContent) {
        assertPostTextWithinLimit(trimmedContent, limit);
      }
    }

    if (task.type === "dm") {
      if (!hasDmBody(trimmedContent, mediaUrls)) {
        throw new Error(
          `DM task "${task.description}" requires message text or media`
        );
      }

      const platform = task.approvalContext?.platform ?? "twitter";
      if (trimmedContent) {
        if (platform === "linkedin") {
          if (trimmedContent.length > LINKEDIN_DM_TEXT_MAX) {
            throw new Error(
              `LinkedIn DM task "${task.description}" exceeds ${LINKEDIN_DM_TEXT_MAX} characters`
            );
          }
        } else {
          assertDmTextWithinLimit(trimmedContent);
        }
      }

      if (platform === "twitter" && mediaUrls.length > 1) {
        throw new Error(
          `X DM task "${task.description}" supports at most one media attachment`
        );
      }
    }

    if (
      task.mediaDescriptions &&
      task.mediaDescriptions.length > mediaUrls.length
    ) {
      throw new Error(
        `Task "${task.description}" has more mediaDescriptions than mediaUrls`
      );
    }
    if (task.mediaKinds && task.mediaKinds.length > mediaUrls.length) {
      throw new Error(
        `Task "${task.description}" has more mediaKinds than mediaUrls`
      );
    }
  }
}

function toPlanSnapshotTask(
  task: Pick<
    Doc<"outreachTasks">,
    | "_id"
    | "order"
    | "type"
    | "description"
    | "status"
    | "content"
    | "targetTweetId"
  >
): OutreachPlanSnapshotTask {
  return {
    _id: task._id,
    order: task.order,
    type: task.type,
    description: task.description,
    status: task.status,
    content: task.content,
    targetTweetId: task.targetTweetId,
  };
}

export function buildPlanSnapshot(
  plan: Pick<
    Doc<"outreachPlans">,
    "_id" | "version" | "status" | "strategy" | "updatedAt"
  >,
  tasks: Array<
    Pick<
      Doc<"outreachTasks">,
      | "_id"
      | "order"
      | "type"
      | "description"
      | "status"
      | "content"
      | "targetTweetId"
    >
  >
): OutreachPlanSnapshot {
  return {
    planId: plan._id,
    version: plan.version,
    status: plan.status,
    strategy: plan.strategy,
    updatedAt: plan.updatedAt,
    tasks: tasks.map(toPlanSnapshotTask),
  };
}

export async function logPlanEvent(
  ctx: MutationCtx,
  input: {
    prospectId: Id<"prospects">;
    workspaceId: Id<"workspaces">;
    type: Extract<Doc<"prospectActivityLog">["type"], "plan_created">;
    title: string;
    planSnapshot: OutreachPlanSnapshot;
    description?: string;
  }
): Promise<Id<"prospectActivityLog">> {
  return await logProspectActivity(ctx, {
    prospectId: input.prospectId,
    workspaceId: input.workspaceId,
    type: input.type,
    title: input.title,
    description: input.description ?? input.planSnapshot.strategy.rationale,
    metadata: {
      planId: input.planSnapshot.planId,
      planSnapshot: input.planSnapshot,
    },
  });
}

// ============================================================================
// Plan Operations
// ============================================================================

/**
 * Create a new outreach plan for a prospect.
 * Enforces single-plan-per-prospect rule.
 */
export async function createOutreachPlan(
  ctx: MutationCtx,
  input: OutreachPlanInput
): Promise<Id<"outreachPlans">> {
  const now = getCurrentUTCTimestamp();
  const prospect = await ctx.db.get("prospects", input.prospectId);
  if (
    !prospect ||
    prospect.workspaceId !== input.workspaceId ||
    prospect.userId !== input.userId
  ) {
    throw new Error("Prospect does not belong to this outreach workspace");
  }
  requireProspectEligibleForOutreach(prospect);

  // Check for existing active plan
  const existingPlan = await ctx.db
    .query("outreachPlans")
    .withIndex("by_prospect", (q) => q.eq("prospectId", input.prospectId))
    .filter((q) =>
      q.and(
        q.neq(q.field("status"), "completed"),
        q.neq(q.field("status"), "abandoned")
      )
    )
    .first();

  if (existingPlan) {
    throw new Error(
      `Active plan already exists for prospect. Use refinePlan instead.`
    );
  }

  // Create the plan
  const planId = await ctx.db.insert("outreachPlans", {
    prospectId: input.prospectId,
    workspaceId: input.workspaceId,
    userId: input.userId,
    status: "draft",
    strategy: input.strategy,
    threadId: input.threadId,
    version: 1,
    updatedAt: now,
  });

  // Validate all tasks before creating (especially comment tasks need content + targetTweetId)
  await validateTaskInputs(ctx, input.userId, input.tasks);

  // Create tasks
  const createdTasks: Array<{
    _id: Id<"outreachTasks">;
    order: number;
    type: OutreachTaskInput["type"];
    description: string;
    status: Infer<typeof outreachTaskStatusValidator>;
    content?: string;
    targetTweetId?: string;
  }> = [];

  for (let i = 0; i < input.tasks.length; i++) {
    const task = input.tasks[i];
    const taskId = await ctx.db.insert("outreachTasks", {
      planId,
      order: i + 1,
      type: task.type,
      description: task.description,
      status: "pending",
      timing: task.timing,
      targetTweetId: task.targetTweetId,
      content: task.content,
      mediaUrls: task.mediaUrls,
      mediaDescriptions: task.mediaDescriptions,
      mediaKinds: task.mediaKinds,
      approvalContext: task.approvalContext,
    });

    createdTasks.push({
      _id: taskId,
      order: i + 1,
      type: task.type,
      description: task.description,
      status: "pending",
      content: task.content,
      targetTweetId: task.targetTweetId,
    });
  }

  const planSnapshot = buildPlanSnapshot(
    {
      _id: planId,
      version: 1,
      status: "draft",
      strategy: input.strategy,
      updatedAt: now,
    },
    createdTasks
  );

  await logPlanEvent(ctx, {
    prospectId: input.prospectId,
    workspaceId: input.workspaceId,
    type: "plan_created",
    title: "Outreach plan created",
    planSnapshot,
  });

  return planId;
}

/**
 * Update an existing plan with refinements.
 */
export async function refinePlan(
  ctx: MutationCtx,
  planId: Id<"outreachPlans">,
  updates: {
    strategy?: OutreachPlanInput["strategy"];
    tasks?: OutreachTaskInput[];
    threadId?: string;
  }
): Promise<void> {
  const plan = await ctx.db.get(planId);
  if (!plan) throw new Error("Plan not found");
  const prospect = await ctx.db.get("prospects", plan.prospectId);
  if (!prospect) throw new Error("Prospect not found");
  requireProspectEligibleForOutreach(prospect);
  if (
    plan.status !== "draft" &&
    plan.status !== "paused" &&
    plan.status !== "blocked_auth" &&
    plan.status !== "executing"
  ) {
    throw new Error(
      "Can only refine draft, paused, blocked, or executing plans"
    );
  }

  const now = getCurrentUTCTimestamp();
  const nextVersion = plan.version + 1;
  const nextStrategy = updates.strategy ?? plan.strategy;
  const nextThreadId = updates.threadId ?? plan.threadId;

  if (
    updates.strategy ||
    updates.tasks ||
    (updates.threadId !== undefined && updates.threadId !== plan.threadId)
  ) {
    await ctx.db.patch(planId, {
      strategy: nextStrategy,
      threadId: nextThreadId,
      version: nextVersion,
      updatedAt: now,
    });
  }

  // Replace tasks if provided
  if (updates.tasks) {
    // Validate all tasks (especially comment tasks need content + targetTweetId)
    await validateTaskInputs(ctx, plan.userId, updates.tasks);

    const existingTasks = await ctx.db
      .query("outreachTasks")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();

    const replaceableStatuses = new Set<
      Infer<typeof outreachTaskStatusValidator>
    >(["pending", "scheduled"]);
    const tasksToReplace =
      plan.status === "executing"
        ? existingTasks.filter((task) => replaceableStatuses.has(task.status))
        : existingTasks;

    const nextOrderStart =
      plan.status === "executing"
        ? existingTasks
            .filter((task) => !replaceableStatuses.has(task.status))
            .reduce((maxOrder, task) => Math.max(maxOrder, task.order), 0) + 1
        : 1;

    for (const task of tasksToReplace) {
      await ctx.db.delete(task._id);
    }

    for (let i = 0; i < updates.tasks.length; i++) {
      const task = updates.tasks[i];
      await ctx.db.insert("outreachTasks", {
        planId,
        order: nextOrderStart + i,
        type: task.type,
        description: task.description,
        status: "pending",
        timing: task.timing,
        targetTweetId: task.targetTweetId,
        content: task.content,
        mediaUrls: task.mediaUrls,
        mediaDescriptions: task.mediaDescriptions,
        mediaKinds: task.mediaKinds,
        approvalContext: task.approvalContext,
      });
    }
  }
}

/**
 * Approve a plan for execution.
 */
export async function approvePlan(
  ctx: MutationCtx,
  planId: Id<"outreachPlans">
): Promise<void> {
  const plan = await ctx.db.get(planId);
  if (!plan) throw new Error("Plan not found");
  const prospect = await ctx.db.get("prospects", plan.prospectId);
  if (!prospect) throw new Error("Prospect not found");
  requireProspectEligibleForOutreach(prospect);
  if (plan.status !== "draft") {
    throw new Error("Can only approve draft plans");
  }

  await ctx.db.patch(planId, {
    status: "approved",
    updatedAt: getCurrentUTCTimestamp(),
  });
}

/**
 * Get a prospect's active plan.
 */
export async function getProspectActivePlan(
  ctx: QueryCtx,
  prospectId: Id<"prospects">
): Promise<{
  plan: Doc<"outreachPlans">;
  tasks: Doc<"outreachTasks">[];
} | null> {
  const plan = await ctx.db
    .query("outreachPlans")
    .withIndex("by_prospect", (q) => q.eq("prospectId", prospectId))
    .order("desc")
    .filter((q) =>
      q.and(
        q.neq(q.field("status"), "completed"),
        q.neq(q.field("status"), "abandoned")
      )
    )
    .first();

  if (!plan) return null;

  const tasks = await ctx.db
    .query("outreachTasks")
    .withIndex("by_plan_order", (q) => q.eq("planId", plan._id))
    .collect();

  return { plan, tasks };
}

/**
 * Permanently deletes an outreach plan and cleanup rows that would otherwise
 * leave stale UI state behind.
 */
export async function deleteOutreachPlanCascade(
  ctx: MutationCtx,
  plan: Doc<"outreachPlans">
): Promise<void> {
  const tasks = await ctx.db
    .query("outreachTasks")
    .withIndex("by_plan", (q) => q.eq("planId", plan._id))
    .collect();
  const taskIdSet = new Set(tasks.map((task) => task._id));

  if (plan.workflowId) {
    try {
      const workflowId = plan.workflowId as unknown as WorkflowId;
      const workflowStatus = await workflowManager.status(ctx, workflowId);
      if (workflowStatus.type === "inProgress") {
        await workflowManager.cancel(ctx, workflowId);
      }
    } catch (error) {
      console.warn("[OutreachCore] Failed to cancel workflow before delete", {
        planId: String(plan._id),
        workflowId: plan.workflowId,
        error,
      });
    }
  }

  const planMonitors = await ctx.db
    .query("prospectMonitors")
    .withIndex("by_plan", (q) => q.eq("planId", plan._id))
    .collect();

  const recoveryMonitors = await ctx.db
    .query("outreachRecoveryMonitors")
    .withIndex("by_prospect_and_status", (q) =>
      q.eq("prospectId", plan.prospectId)
    )
    .take(100);

  for (const monitor of planMonitors) {
    if (monitor.status !== "deleted") {
      await ctx.scheduler.runAfter(
        0,
        internal.prospectMonitors.deleteProspectMonitor,
        { monitorId: monitor.monitorId }
      );
    }
    await ctx.db.delete(monitor._id);
  }

  for (const monitor of recoveryMonitors) {
    if (monitor.planId === plan._id) {
      await ctx.db.delete(monitor._id);
    }
  }

  const actionRequestsByStatus = await Promise.all(
    PLAN_DELETE_ACTION_REQUEST_STATUSES.map((status) =>
      ctx.db
        .query("agentActionRequests")
        .withIndex("by_prospect_status", (q) =>
          q.eq("prospectId", plan.prospectId).eq("status", status)
        )
        .collect()
    )
  );
  const actionRequests = actionRequestsByStatus
    .flat()
    .filter(
      (request) =>
        request.planId === plan._id ||
        (request.taskId ? taskIdSet.has(request.taskId) : false)
    );
  const actionRequestIdSet = new Set(
    actionRequests.map((request) => request._id)
  );

  const workspaceNotifications = await ctx.db
    .query("outreachNotifications")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", plan.workspaceId))
    .collect();
  const notificationsToDelete = workspaceNotifications.filter(
    (notification) =>
      notification.planId === plan._id ||
      (notification.taskId ? taskIdSet.has(notification.taskId) : false) ||
      (notification.actionRequestId
        ? actionRequestIdSet.has(notification.actionRequestId)
        : false)
  );

  const memoryWorkflowEvents = await ctx.db
    .query("memoryWorkflowEvents")
    .withIndex("by_plan_occurred_at", (q) => q.eq("planId", plan._id))
    .collect();

  const memorySuggestionsByStatus = await Promise.all(
    PLAN_DELETE_MEMORY_SUGGESTION_STATUSES.map((status) =>
      ctx.db
        .query("memorySuggestions")
        .withIndex("by_workspace_status_updated_at", (q) =>
          q.eq("workspaceId", plan.workspaceId).eq("status", status)
        )
        .collect()
    )
  );
  const memorySuggestions = memorySuggestionsByStatus
    .flat()
    .filter(
      (suggestion) =>
        suggestion.planId === plan._id ||
        (suggestion.taskId ? taskIdSet.has(suggestion.taskId) : false)
    );

  const prospectActivities = await ctx.db
    .query("prospectActivityLog")
    .withIndex("by_prospect", (q) => q.eq("prospectId", plan.prospectId))
    .collect();
  const planActivities = prospectActivities.filter((activity) => {
    const metadata = isRecord(activity.metadata) ? activity.metadata : null;
    return metadata?.planId === plan._id;
  });

  for (const notification of notificationsToDelete) {
    await ctx.db.delete(notification._id);
  }

  for (const actionRequest of actionRequests) {
    await ctx.db.delete(actionRequest._id);
  }

  for (const memorySuggestion of memorySuggestions) {
    await ctx.db.delete(memorySuggestion._id);
  }

  for (const memoryWorkflowEvent of memoryWorkflowEvents) {
    await ctx.db.delete(memoryWorkflowEvent._id);
  }

  for (const activity of planActivities) {
    await ctx.db.delete(activity._id);
  }

  for (const task of tasks) {
    await ctx.db.delete(task._id);
  }

  await ctx.db.delete(plan._id);
}

// ============================================================================
// Activity Log Operations
// ============================================================================

/**
 * Get prospect activity log.
 */
export async function getProspectActivityLog(
  ctx: QueryCtx,
  prospectId: Id<"prospects">,
  options?: { limit?: number; type?: Doc<"prospectActivityLog">["type"] }
): Promise<Doc<"prospectActivityLog">[]> {
  if (options?.type) {
    const typedQuery = ctx.db
      .query("prospectActivityLog")
      .withIndex("by_prospect_type", (q) =>
        q.eq("prospectId", prospectId).eq("type", options.type!)
      )
      .order("desc");

    if (options.limit !== undefined) {
      return await typedQuery.take(options.limit);
    }
    return await typedQuery.collect();
  }

  const activityQuery = ctx.db
    .query("prospectActivityLog")
    .withIndex("by_prospect", (q) => q.eq("prospectId", prospectId))
    .order("desc");

  if (options?.limit !== undefined) {
    return await activityQuery.take(options.limit);
  }

  return await activityQuery.collect();
}

/**
 * Log an activity for a prospect.
 */
export async function logProspectActivity(
  ctx: MutationCtx,
  input: {
    prospectId: Id<"prospects">;
    workspaceId: Id<"workspaces">;
    type: Doc<"prospectActivityLog">["type"];
    title: string;
    description?: string;
    metadata?: Infer<typeof prospectActivityMetadataValidator>;
  }
): Promise<Id<"prospectActivityLog">> {
  return await ctx.db.insert("prospectActivityLog", {
    ...input,
  });
}

/**
 * Replace all existing activity rows of a given type for a prospect with a
 * single fresh row. Used for singleton timeline events like enrichment where
 * retries should update the latest state instead of creating duplicates.
 */
export async function replaceProspectActivityOfType(
  ctx: MutationCtx,
  input: {
    prospectId: Id<"prospects">;
    workspaceId: Id<"workspaces">;
    type: Doc<"prospectActivityLog">["type"];
    title: string;
    description?: string;
    metadata?: Infer<typeof prospectActivityMetadataValidator>;
  }
): Promise<Id<"prospectActivityLog">> {
  const existingActivities = await ctx.db
    .query("prospectActivityLog")
    .withIndex("by_prospect_type", (q) =>
      q.eq("prospectId", input.prospectId).eq("type", input.type)
    )
    .collect();

  await Promise.all(
    existingActivities.map((activity) => ctx.db.delete(activity._id))
  );

  return await logProspectActivity(ctx, input);
}

// ============================================================================
// Notification Operations
// ============================================================================

/**
 * Create a notification.
 */
export async function createNotification(
  ctx: MutationCtx,
  input: {
    userId: Id<"users">;
    workspaceId: Id<"workspaces">;
    type: Doc<"outreachNotifications">["type"];
    title: string;
    message: string;
    targetHref?: string;
    notificationKey?: string;
    contextPlatform?: Doc<"prospects">["platform"];
    prospectId?: Id<"prospects">;
    planId?: Id<"outreachPlans">;
    taskId?: Id<"outreachTasks">;
    actionRequestId?: Id<"agentActionRequests">;
    toolCallId?: string;
    threadId?: string;
    // Denormalized prospect data for efficient display
    prospectAvatarUrl?: string;
    prospectDisplayName?: string;
    prospectType?: Doc<"prospects">["prospectType"];
    prospectPlatform?: Doc<"prospects">["platform"];
    prospectScreenName?: string;
    replyCount?: number;
  }
): Promise<Id<"outreachNotifications">> {
  return await createNotificationRecord(ctx, input);
}
