import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDisqualificationOutreachCleanupSummary,
  createEmptyDisqualificationOutreachCleanupSummary,
  isActiveOutreachPlanStatus,
  mergeDisqualificationOutreachCleanupSummaries,
} from "../convex/lib/disqualificationOutreachCore";

test("only non-terminal outreach artifacts are included in cleanup", () => {
  assert.deepEqual(
    buildDisqualificationOutreachCleanupSummary({
      planStatus: "executing",
      hasWorkflow: true,
      taskStatuses: ["pending", "executing", "completed", "failed"],
      prospectMonitorStatuses: ["active", "paused", "deleted"],
      recoveryMonitorStatuses: ["active", "completed", "expired"],
      actionRequestStatuses: [
        "pending_approval",
        "executing",
        "completed",
        "cancelled",
      ],
      notificationStatuses: ["pending", "seen", "dismissed"],
    }),
    {
      plans: 1,
      tasks: 2,
      workflows: 1,
      prospectMonitors: 2,
      recoveryMonitors: 1,
      actionRequests: 2,
      notifications: 2,
    }
  );
});

test("terminal plans are idempotent no-ops", () => {
  assert.equal(isActiveOutreachPlanStatus("abandoned"), false);
  assert.equal(isActiveOutreachPlanStatus("completed"), false);
  assert.deepEqual(
    buildDisqualificationOutreachCleanupSummary({
      planStatus: "abandoned",
      hasWorkflow: true,
      taskStatuses: ["pending"],
      prospectMonitorStatuses: ["active"],
      recoveryMonitorStatuses: ["active"],
      actionRequestStatuses: ["pending_approval"],
      notificationStatuses: ["pending"],
    }),
    createEmptyDisqualificationOutreachCleanupSummary()
  );
});

test("cleanup summaries merge every affected artifact count", () => {
  assert.deepEqual(
    mergeDisqualificationOutreachCleanupSummaries(
      {
        plans: 1,
        tasks: 3,
        workflows: 1,
        prospectMonitors: 0,
        recoveryMonitors: 1,
        actionRequests: 2,
        notifications: 2,
      },
      {
        plans: 2,
        tasks: 5,
        workflows: 0,
        prospectMonitors: 1,
        recoveryMonitors: 0,
        actionRequests: 1,
        notifications: 4,
      }
    ),
    {
      plans: 3,
      tasks: 8,
      workflows: 1,
      prospectMonitors: 1,
      recoveryMonitors: 1,
      actionRequests: 3,
      notifications: 6,
    }
  );
});
