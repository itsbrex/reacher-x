import assert from "node:assert/strict";
import test from "node:test";
import type { Id } from "../convex/_generated/dataModel";
import {
  buildPreviewProvisioningFailurePatch,
  buildSetupPreviewCapacityResetPatch,
  canWriteSetupPreviewProspectBatch,
  isValidatedSetupPreviewProspect,
} from "../convex/lib/setupSessionCore";
import { canProvisionUnpaidFirstWorkspacePreview } from "../convex/lib/workspaceEntitlements";

function asId<
  TableName extends "users" | "workspaces" | "workspaceSetupSessions",
>(value: string) {
  return value as Id<TableName>;
}

const userId = asId<"users">("user_1");
const sessionId = asId<"workspaceSetupSessions">("session_1");
const validSession = {
  _id: sessionId,
  userId,
  mode: "first_workspace" as const,
  status: "provisioning_preview_workspace" as const,
  entitlementSlot: 1,
  targetWorkspaceId: undefined,
  existingWorkspaceId: undefined,
};

test("unpaid users may provision only their active first-workspace preview", () => {
  assert.equal(
    canProvisionUnpaidFirstWorkspacePreview({
      session: validSession,
      userId,
      setupSessionId: sessionId,
      entitlementSlot: 1,
    }),
    true
  );
});

test("unpaid preview entitlement rejects every non-preview workspace path", () => {
  const invalidSessions = [
    null,
    { ...validSession, mode: "new_workspace" as const },
    { ...validSession, status: "awaiting_icp_confirmation" as const },
    {
      ...validSession,
      targetWorkspaceId: asId<"workspaces">("workspace_existing"),
    },
    {
      ...validSession,
      existingWorkspaceId: asId<"workspaces">("workspace_existing"),
    },
  ];

  for (const session of invalidSessions) {
    assert.equal(
      canProvisionUnpaidFirstWorkspacePreview({
        session,
        userId,
        setupSessionId: sessionId,
        entitlementSlot: 1,
      }),
      false
    );
  }

  assert.equal(
    canProvisionUnpaidFirstWorkspacePreview({
      session: validSession,
      userId: asId<"users">("other_user"),
      setupSessionId: sessionId,
      entitlementSlot: 1,
    }),
    false
  );
  assert.equal(
    canProvisionUnpaidFirstWorkspacePreview({
      session: validSession,
      userId,
      setupSessionId: asId<"workspaceSetupSessions">("other_session"),
      entitlementSlot: 1,
    }),
    false
  );
  assert.equal(
    canProvisionUnpaidFirstWorkspacePreview({
      session: validSession,
      userId,
      setupSessionId: sessionId,
      entitlementSlot: 2,
    }),
    false
  );
});

test("preview provisioning failures return to ideal-profile approval with a visible retry error", () => {
  assert.deepEqual(
    buildPreviewProvisioningFailurePatch({
      now: 1234,
      errorMessage: "Please retry",
    }),
    {
      status: "awaiting_icp_confirmation",
      previewWorkflowId: undefined,
      previewDiscoveryStartedAt: undefined,
      previewProspectIds: undefined,
      previewReviewMode: undefined,
      previewReadyAt: undefined,
      previewApprovedAt: undefined,
      lastAgentActionAt: 1234,
      lastActiveAt: 1234,
      statusUpdatedAt: 1234,
      errorCode: "preview_provisioning_failed",
      errorMessage: "Please retry",
    }
  );
});

test("only bounded, current setup-preview batches bypass paid prospect limits", () => {
  const workspaceId = asId<"workspaces">("workspace_1");
  const previewSession = {
    _id: sessionId,
    userId,
    targetWorkspaceId: workspaceId,
    previewRevision: 4,
    status: "preview_search_in_progress" as const,
  };
  const baseArgs = {
    session: previewSession,
    sessionId,
    userId,
    workspaceId,
    workspaceUserId: userId,
    previewRevision: 4,
    batchSize: 20,
    maxBatchSize: 250,
  };

  assert.equal(canWriteSetupPreviewProspectBatch(baseArgs), true);
  assert.equal(
    canWriteSetupPreviewProspectBatch({ ...baseArgs, batchSize: 251 }),
    false
  );
  assert.equal(
    canWriteSetupPreviewProspectBatch({ ...baseArgs, previewRevision: 3 }),
    false
  );
  assert.equal(
    canWriteSetupPreviewProspectBatch({
      ...baseArgs,
      session: { ...previewSession, status: "awaiting_plan" },
    }),
    false
  );
  assert.equal(
    canWriteSetupPreviewProspectBatch({
      ...baseArgs,
      workspaceUserId: asId<"users">("other_user"),
    }),
    false
  );
});

test("unfinished setup workspaces can clear an erroneous capacity state", () => {
  assert.deepEqual(buildSetupPreviewCapacityResetPatch(), {
    prospectingWorkflowId: undefined,
    prospectingWorkflowStatus: undefined,
    prospectingWorkflowStartedAt: undefined,
    prospectingWorkflowPauseReason: undefined,
    prospectingWorkflowPausedAt: undefined,
    prospectingFailureStreak: undefined,
    prospectingRecoveryAttemptId: undefined,
    prospectingLastFailureAt: undefined,
    prospectingNextRunAt: undefined,
    prospectingNextRecoveryAt: undefined,
    onboardingIssueStatusCode: undefined,
    onboardingIssueSource: undefined,
    onboardingIssueUpdatedAt: undefined,
  });
});

test("preview qualification bypass requires the same active setup provenance", () => {
  const workspaceId = asId<"workspaces">("workspace_1");
  const session = {
    _id: sessionId,
    userId,
    targetWorkspaceId: workspaceId,
    previewRevision: 2,
    status: "awaiting_preview_confirmation" as const,
  };
  const prospect = {
    origin: "setup_preview" as const,
    setupSessionId: sessionId,
    setupRevision: 2,
    userId,
    workspaceId,
  };

  assert.equal(
    isValidatedSetupPreviewProspect({
      prospect,
      session,
      workspaceUserId: userId,
      workspaceId,
    }),
    true
  );
  assert.equal(
    isValidatedSetupPreviewProspect({
      prospect: { ...prospect, setupRevision: 1 },
      session,
      workspaceUserId: userId,
      workspaceId,
    }),
    false
  );
  assert.equal(
    isValidatedSetupPreviewProspect({
      prospect: { ...prospect, origin: "workspace_discovery" },
      session,
      workspaceUserId: userId,
      workspaceId,
    }),
    false
  );
});
