import assert from "node:assert/strict";
import test from "node:test";
import { resolveOutreachPlanPreviewState } from "../shared/lib/outreach/planPreviewState";

test("returns a disabled deleted tombstone once a persisted plan has been deleted", () => {
  const result = resolveOutreachPlanPreviewState({
    planId: "plan_123",
    livePlanData: null,
    fallbackStatus: "draft",
    fallbackRationale: "Fallback rationale",
    fallbackTasks: [{ _id: "task_1" }],
  });

  assert.deepEqual(result, {
    status: "deleted",
    rationale: "Fallback rationale",
    tasks: [{ _id: "task_1" }],
    actionsDisabled: true,
    showPlanDisabled: true,
  });
});

test("returns a neutral syncing state while a persisted plan is still resolving", () => {
  const result = resolveOutreachPlanPreviewState({
    planId: "plan_123",
    livePlanData: undefined,
    fallbackStatus: "draft",
    fallbackRationale: "Fallback rationale",
    fallbackTasks: [{ _id: "task_1" }],
    isPending: true,
  });

  assert.deepEqual(result, {
    status: "loading",
    rationale: "Fallback rationale",
    tasks: [{ _id: "task_1" }],
    actionsDisabled: true,
    showPlanDisabled: true,
  });
});

test("keeps fallback content while live plan data is still loading", () => {
  const result = resolveOutreachPlanPreviewState({
    planId: "plan_123",
    livePlanData: undefined,
    fallbackStatus: "draft",
    fallbackRationale: "Fallback rationale",
    fallbackTasks: [{ _id: "task_1" }],
  });

  assert.deepEqual(result, {
    status: "draft",
    rationale: "Fallback rationale",
    tasks: [{ _id: "task_1" }],
    actionsDisabled: false,
    showPlanDisabled: false,
  });
});

test("prefers live plan data when it is available", () => {
  const result = resolveOutreachPlanPreviewState({
    planId: "plan_123",
    livePlanData: {
      plan: {
        status: "paused",
        strategy: {
          rationale: "Live rationale",
        },
      },
      tasks: [{ _id: "task_live" }],
    },
    fallbackStatus: "draft",
    fallbackRationale: "Fallback rationale",
    fallbackTasks: [{ _id: "task_1" }],
  });

  assert.deepEqual(result, {
    status: "paused",
    rationale: "Live rationale",
    tasks: [{ _id: "task_live" }],
    actionsDisabled: false,
    showPlanDisabled: false,
  });
});
