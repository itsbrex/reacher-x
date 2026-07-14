import type { GenericDatabaseReader } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { getCurrentUTCTimestamp } from "../../shared/lib/utils/time/timeUtils";
import { recordMemoryWorkflowEvent } from "./memoryCore";
import { workflow as workflowManager } from "./workflow";

const ACTIVE_PLAN_STATUSES = new Set<Doc<"outreachPlans">["status"]>([
  "draft",
  "approved",
  "executing",
  "paused",
  "blocked_auth",
]);

const NON_TERMINAL_TASK_STATUSES = new Set<Doc<"outreachTasks">["status"]>([
  "pending",
  "scheduled",
  "executing",
  "waiting_manual",
  "waiting_connection",
  "waiting_response",
]);

const ACTIVE_ACTION_REQUEST_STATUSES = new Set<
  Doc<"agentActionRequests">["status"]
>(["draft", "pending_approval", "approved", "executing"]);

type WorkflowId = Awaited<ReturnType<typeof workflowManager.start>>;

export const DISQUALIFICATION_ACTIVE_PLAN_STATUSES = [
  "draft",
  "approved",
  "executing",
  "paused",
  "blocked_auth",
] as const satisfies ReadonlyArray<Doc<"outreachPlans">["status"]>;

export type DisqualificationOutreachCleanupSummary = {
  plans: number;
  tasks: number;
  workflows: number;
  prospectMonitors: number;
  recoveryMonitors: number;
  actionRequests: number;
  notifications: number;
};

export type DisqualificationOutreachPlanArtifacts = {
  tasks: Doc<"outreachTasks">[];
  prospectMonitors: Doc<"prospectMonitors">[];
  recoveryMonitors: Doc<"outreachRecoveryMonitors">[];
  actionRequests: Doc<"agentActionRequests">[];
  notifications: Doc<"outreachNotifications">[];
};

export function createEmptyDisqualificationOutreachCleanupSummary(): DisqualificationOutreachCleanupSummary {
  return {
    plans: 0,
    tasks: 0,
    workflows: 0,
    prospectMonitors: 0,
    recoveryMonitors: 0,
    actionRequests: 0,
    notifications: 0,
  };
}

export function mergeDisqualificationOutreachCleanupSummaries(
  left: DisqualificationOutreachCleanupSummary,
  right: DisqualificationOutreachCleanupSummary
): DisqualificationOutreachCleanupSummary {
  return {
    plans: left.plans + right.plans,
    tasks: left.tasks + right.tasks,
    workflows: left.workflows + right.workflows,
    prospectMonitors: left.prospectMonitors + right.prospectMonitors,
    recoveryMonitors: left.recoveryMonitors + right.recoveryMonitors,
    actionRequests: left.actionRequests + right.actionRequests,
    notifications: left.notifications + right.notifications,
  };
}

export function isActiveOutreachPlanStatus(
  status: Doc<"outreachPlans">["status"]
): boolean {
  return ACTIVE_PLAN_STATUSES.has(status);
}

export function isNonTerminalOutreachTaskStatus(
  status: Doc<"outreachTasks">["status"]
): boolean {
  return NON_TERMINAL_TASK_STATUSES.has(status);
}

export function isActiveActionRequestStatus(
  status: Doc<"agentActionRequests">["status"]
): boolean {
  return ACTIVE_ACTION_REQUEST_STATUSES.has(status);
}

export async function loadDisqualificationOutreachPlanArtifacts(
  db: GenericDatabaseReader<DataModel>,
  planId: Id<"outreachPlans">
): Promise<DisqualificationOutreachPlanArtifacts> {
  const [tasks, prospectMonitors, recoveryMonitors, actionRequests] =
    await Promise.all([
      db
        .query("outreachTasks")
        .withIndex("by_plan", (q) => q.eq("planId", planId))
        .collect(),
      db
        .query("prospectMonitors")
        .withIndex("by_plan", (q) => q.eq("planId", planId))
        .collect(),
      db
        .query("outreachRecoveryMonitors")
        .withIndex("by_plan", (q) => q.eq("planId", planId))
        .collect(),
      db
        .query("agentActionRequests")
        .withIndex("by_plan", (q) => q.eq("planId", planId))
        .collect(),
    ]);

  const notificationGroups = await Promise.all([
    db
      .query("outreachNotifications")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect(),
    ...tasks.map((task) =>
      db
        .query("outreachNotifications")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect()
    ),
    ...actionRequests.map((request) =>
      db
        .query("outreachNotifications")
        .withIndex("by_action_request", (q) =>
          q.eq("actionRequestId", request._id)
        )
        .collect()
    ),
  ]);
  const notificationsById = new Map<
    Id<"outreachNotifications">,
    Doc<"outreachNotifications">
  >();
  for (const notification of notificationGroups.flat()) {
    notificationsById.set(notification._id, notification);
  }

  return {
    tasks,
    prospectMonitors,
    recoveryMonitors,
    actionRequests,
    notifications: [...notificationsById.values()],
  };
}

export function summarizeDisqualificationOutreachPlanCleanup(args: {
  plan: Doc<"outreachPlans">;
  artifacts: DisqualificationOutreachPlanArtifacts;
}): DisqualificationOutreachCleanupSummary {
  return buildDisqualificationOutreachCleanupSummary({
    planStatus: args.plan.status,
    hasWorkflow: Boolean(args.plan.workflowId),
    taskStatuses: args.artifacts.tasks.map((task) => task.status),
    prospectMonitorStatuses: args.artifacts.prospectMonitors.map(
      (monitor) => monitor.status
    ),
    recoveryMonitorStatuses: args.artifacts.recoveryMonitors.map(
      (monitor) => monitor.status
    ),
    actionRequestStatuses: args.artifacts.actionRequests.map(
      (request) => request.status
    ),
    notificationStatuses: args.artifacts.notifications.map(
      (notification) => notification.status
    ),
  });
}

export function buildDisqualificationOutreachCleanupSummary(args: {
  planStatus: Doc<"outreachPlans">["status"];
  hasWorkflow: boolean;
  taskStatuses: Array<Doc<"outreachTasks">["status"]>;
  prospectMonitorStatuses: Array<Doc<"prospectMonitors">["status"]>;
  recoveryMonitorStatuses: Array<Doc<"outreachRecoveryMonitors">["status"]>;
  actionRequestStatuses: Array<Doc<"agentActionRequests">["status"]>;
  notificationStatuses: Array<Doc<"outreachNotifications">["status"]>;
}): DisqualificationOutreachCleanupSummary {
  if (!isActiveOutreachPlanStatus(args.planStatus)) {
    return createEmptyDisqualificationOutreachCleanupSummary();
  }

  return {
    plans: 1,
    tasks: args.taskStatuses.filter(isNonTerminalOutreachTaskStatus).length,
    workflows: args.hasWorkflow ? 1 : 0,
    prospectMonitors: args.prospectMonitorStatuses.filter(
      (status) => status !== "deleted"
    ).length,
    recoveryMonitors: args.recoveryMonitorStatuses.filter(
      (status) => status === "active"
    ).length,
    actionRequests: args.actionRequestStatuses.filter(
      isActiveActionRequestStatus
    ).length,
    notifications: args.notificationStatuses.filter(
      (status) => status !== "dismissed"
    ).length,
  };
}

async function cancelPlanWorkflow(
  ctx: MutationCtx,
  plan: Doc<"outreachPlans">
): Promise<number> {
  if (!plan.workflowId) return 0;

  try {
    const workflowId = plan.workflowId as unknown as WorkflowId;
    const status = await workflowManager.status(ctx, workflowId);
    if (status.type !== "inProgress") return 0;
    await workflowManager.cancel(ctx, workflowId);
    return 1;
  } catch (error) {
    console.warn(
      "[DisqualificationOutreachCore] Failed to cancel outreach workflow",
      {
        planId: String(plan._id),
        workflowId: plan.workflowId,
        error,
      }
    );
    return 0;
  }
}

export async function reconcileDisqualifiedOutreachPlan(
  ctx: MutationCtx,
  planId: Id<"outreachPlans">
): Promise<DisqualificationOutreachCleanupSummary> {
  const plan = await ctx.db.get("outreachPlans", planId);
  if (!plan || !isActiveOutreachPlanStatus(plan.status)) {
    return createEmptyDisqualificationOutreachCleanupSummary();
  }

  const prospect = await ctx.db.get("prospects", plan.prospectId);
  if (!prospect || prospect.qualificationStatus !== "disqualified") {
    return createEmptyDisqualificationOutreachCleanupSummary();
  }

  const artifacts = await loadDisqualificationOutreachPlanArtifacts(
    ctx.db,
    plan._id
  );
  const preview = summarizeDisqualificationOutreachPlanCleanup({
    plan,
    artifacts,
  });
  const now = getCurrentUTCTimestamp();
  const workflows = await cancelPlanWorkflow(ctx, plan);

  await Promise.all([
    ...artifacts.tasks
      .filter((task) => isNonTerminalOutreachTaskStatus(task.status))
      .map((task) =>
        ctx.db.patch("outreachTasks", task._id, {
          status: "skipped",
          errorMessage: "Skipped because the prospect was disqualified",
        })
      ),
    ...artifacts.actionRequests
      .filter((request) => isActiveActionRequestStatus(request.status))
      .map((request) =>
        ctx.db.patch("agentActionRequests", request._id, {
          status: "cancelled",
          completedAt: now,
        })
      ),
    ...artifacts.notifications
      .filter((notification) => notification.status !== "dismissed")
      .map((notification) =>
        ctx.db.patch("outreachNotifications", notification._id, {
          status: "dismissed",
          dismissedAt: now,
        })
      ),
    ...artifacts.recoveryMonitors
      .filter((monitor) => monitor.status === "active")
      .map((monitor) =>
        ctx.db.patch("outreachRecoveryMonitors", monitor._id, {
          status: "expired",
          nextCheckAt: undefined,
          lastErrorMessage: "Prospect was disqualified",
          completedAt: now,
        })
      ),
    ...artifacts.prospectMonitors
      .filter((monitor) => monitor.status !== "deleted")
      .map((monitor) =>
        ctx.db.patch("prospectMonitors", monitor._id, { status: "deleted" })
      ),
  ]);

  for (const monitor of artifacts.prospectMonitors) {
    if (monitor.status === "deleted") continue;
    await ctx.scheduler.runAfter(
      0,
      internal.prospectMonitors.deleteProspectMonitor,
      { monitorId: monitor.monitorId }
    );
  }

  await ctx.db.patch("outreachPlans", plan._id, {
    status: "abandoned",
    updatedAt: now,
  });
  await recordMemoryWorkflowEvent(ctx, {
    workspaceId: plan.workspaceId,
    eventType: "outreach_plan_abandoned",
    sourceType: "outreach_plan",
    sourceId: String(plan._id),
    planId: plan._id,
    prospectId: plan.prospectId,
    payload: {
      previousStatus: plan.status,
      nextStatus: "abandoned",
      reason: "prospect_disqualified",
    },
    eventKey: `outreach-plan:${plan._id}:abandoned:prospect-disqualified`,
  });

  return { ...preview, workflows };
}

export async function reconcileDisqualifiedProspectOutreach(
  ctx: MutationCtx,
  prospectId: Id<"prospects">
): Promise<DisqualificationOutreachCleanupSummary> {
  const prospect = await ctx.db.get("prospects", prospectId);
  if (!prospect || prospect.qualificationStatus !== "disqualified") {
    return createEmptyDisqualificationOutreachCleanupSummary();
  }

  const plans = await ctx.db
    .query("outreachPlans")
    .withIndex("by_prospect", (q) => q.eq("prospectId", prospectId))
    .collect();
  let summary = createEmptyDisqualificationOutreachCleanupSummary();
  for (const plan of plans) {
    if (!isActiveOutreachPlanStatus(plan.status)) continue;
    summary = mergeDisqualificationOutreachCleanupSummaries(
      summary,
      await reconcileDisqualifiedOutreachPlan(ctx, plan._id)
    );
  }
  return summary;
}
