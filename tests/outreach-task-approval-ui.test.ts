import assert from "node:assert/strict";
import test from "node:test";
import { resolveOutreachTaskApprovalUiState } from "../shared/lib/outreach/taskApprovalHelpers";

test("draft plan tasks surface an approve plan CTA before task approval", () => {
  assert.deepEqual(
    resolveOutreachTaskApprovalUiState({
      kind: "dm",
      mode: "approval",
      approvalReady: false,
      planId: "plan_123",
      planStatus: "draft",
    }),
    {
      submitBlockedByPlan: true,
      planCanBeApproved: true,
      submitButtonText: "Approve plan",
    }
  );
});

test("ready dm tasks surface an approve dm CTA", () => {
  assert.deepEqual(
    resolveOutreachTaskApprovalUiState({
      kind: "dm",
      mode: "approval",
      approvalReady: true,
      planId: "plan_123",
      planStatus: "executing",
    }),
    {
      submitBlockedByPlan: false,
      planCanBeApproved: false,
      submitButtonText: "Approve DM",
    }
  );
});

test("reply tasks without a plan CTA stay disabled until approval is prepared", () => {
  assert.deepEqual(
    resolveOutreachTaskApprovalUiState({
      kind: "post",
      mode: "approval",
      approvalReady: false,
      planId: null,
      planStatus: "approved",
    }),
    {
      submitBlockedByPlan: true,
      planCanBeApproved: false,
      submitButtonText: "Preparing approval",
    }
  );
});

test("ready LinkedIn tasks use comment language", () => {
  assert.deepEqual(
    resolveOutreachTaskApprovalUiState({
      kind: "post",
      platform: "linkedin",
      mode: "approval",
      approvalReady: true,
      planId: "plan_123",
      planStatus: "executing",
    }),
    {
      submitBlockedByPlan: false,
      planCanBeApproved: false,
      submitButtonText: "Approve comment",
    }
  );
});
