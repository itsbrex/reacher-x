import assert from "node:assert/strict";
import test from "node:test";
import type { ToolCtx } from "@convex-dev/agent";
import { getToolPromptMessageId } from "../convex/agents/tools/workspaceMemoryHelpers";
import type { ModelMessage } from "ai";
import {
  PLAN_BATCH_REFERENCE_PATTERN,
  buildPlanBatchReferenceCatalogContext,
  createPlanBatchReferenceKey,
  buildScopedPlanBatchPrompt,
  filterLegacySharedBatchTurns,
  getDefaultPlanBatchInstruction,
  normalizePlanBatchFitRange,
  resolvePlanBatchApplication,
  resolvePlanBatchEligibility,
  resolvePlanBatchTargetInstructions,
} from "../convex/lib/planBatchCore";

test("fit-score ranges are inclusive, bounded, and ordered", () => {
  assert.deepEqual(normalizePlanBatchFitRange({ min: 69.6, max: 80.4 }), {
    min: 70,
    max: 80,
  });
  assert.deepEqual(normalizePlanBatchFitRange({ min: -10, max: 120 }), {
    min: 0,
    max: 100,
  });
  assert.throws(
    () => normalizePlanBatchFitRange({ min: 81, max: 70 }),
    /minimum cannot be greater/
  );
});

test("disqualified and archived prospects are never eligible", () => {
  assert.deepEqual(
    resolvePlanBatchEligibility({
      prospect: {
        origin: "workspace_discovery",
        qualificationStatus: "disqualified",
        status: "new",
      },
      activePlan: null,
      requestedOperation: "create",
    }),
    { eligible: false, reason: "disqualified" }
  );
  assert.deepEqual(
    resolvePlanBatchEligibility({
      prospect: {
        origin: "workspace_discovery",
        qualificationStatus: "qualified",
        status: "archived",
      },
      activePlan: null,
      requestedOperation: "create",
    }),
    { eligible: false, reason: "archived" }
  );
});

test("create-or-update resolves to one effective operation per prospect", () => {
  assert.deepEqual(
    resolvePlanBatchEligibility({
      prospect: {
        origin: "workspace_discovery",
        qualificationStatus: "qualified",
        status: "new",
      },
      activePlan: null,
      requestedOperation: "create_or_update",
    }),
    { eligible: true, operation: "create" }
  );

  const activePlan = {
    _id: "plan-1",
    status: "draft" as const,
    version: 4,
  };
  assert.deepEqual(
    resolvePlanBatchEligibility({
      prospect: {
        origin: "workspace_discovery",
        qualificationStatus: "qualified",
        status: "new",
      },
      activePlan: activePlan as never,
      requestedOperation: "create_or_update",
    }),
    {
      eligible: true,
      operation: "update",
      baselinePlanId: "plan-1",
      baselinePlanVersion: 4,
    }
  );
});

test("plan groups use safe references and expose only compact context", () => {
  const reference = createPlanBatchReferenceKey();
  assert.match(reference, PLAN_BATCH_REFERENCE_PATTERN);

  const context = buildPlanBatchReferenceCatalogContext([
    {
      reference,
      operation: "create",
      status: "completed",
      targetCount: 2,
      prospectNames: ["Nick LoPiccolo", "Logan Gott"],
      createdAt: 1,
    },
  ]);

  assert.match(context ?? "", new RegExp(reference));
  assert.match(context ?? "", /Nick LoPiccolo and Logan Gott/);
  assert.match(context ?? "", /safe aliases, not database IDs/);
  assert.doesNotMatch(context ?? "", /prospectId|runId|storage/i);
});

test("tool prompt message resolution supports the installed Agent runtime", () => {
  assert.equal(
    getToolPromptMessageId({
      messageId: "documented-message",
    } as ToolCtx),
    "documented-message"
  );
  assert.equal(
    getToolPromptMessageId({
      promptMessageId: "runtime-message",
    } as ToolCtx & { promptMessageId: string }),
    "runtime-message"
  );
});

test("scoped prompts contain only the current prospect instruction", () => {
  const prompt = buildScopedPlanBatchPrompt({
    prospectName: "Michel Lieben",
    operation: "update",
    sharedInstruction: "Make the opener shorter.",
    targetInstruction: "Reference Michel's latest launch.",
    attachments: [
      {
        url: "https://example.com/michel.png",
        fileName: "michel.png",
        mediaKind: "image",
      },
    ],
  });

  assert.match(prompt, /Michel Lieben/);
  assert.match(prompt, /Michel's latest launch/);
  assert.match(prompt, /https:\/\/example.com\/michel.png/);
  assert.doesNotMatch(prompt, /Nick|Logan/);
});

test("delegated plan creation gets a platform-neutral research-grounded default", () => {
  const instruction = getDefaultPlanBatchInstruction("create");

  assert.match(instruction, /research-grounded/i);
  assert.match(instruction, /channels actually available/i);
  assert.doesNotMatch(instruction, /LinkedIn|Twitter|X post/i);
});

test("legacy shared fan-out turns are removed as one complete turn", () => {
  const messages: ModelMessage[] = [
    { role: "user", content: "Earlier normal message" },
    { role: "assistant", content: "Earlier normal response" },
    {
      role: "user",
      content:
        "Operator instruction (sent to multiple prospects at once):\nNick: one\nMichel: two",
    },
    { role: "assistant", content: "Applied the shared request." },
    { role: "user", content: "Current isolated request" },
  ];

  assert.deepEqual(filterLegacySharedBatchTurns(messages), [
    { role: "user", content: "Earlier normal message" },
    { role: "assistant", content: "Earlier normal response" },
    { role: "user", content: "Current isolated request" },
  ]);
});

test("target-specific instructions require an exact unique name or handle", () => {
  const targets = [
    {
      prospectId: "prospect_1",
      label: "Nick LoPiccolo",
      handle: "nicklopiccolo",
    },
    {
      prospectId: "prospect_2",
      label: "Nick Johnston",
      handle: "nickjohnston",
    },
  ];

  assert.throws(
    () =>
      resolvePlanBatchTargetInstructions({
        targets,
        instructions: [
          {
            prospectName: "Nick",
            instruction: "Reference the fundraising discussion.",
          },
        ],
      }),
    /did not exactly match/
  );
  assert.deepEqual(
    resolvePlanBatchTargetInstructions({
      targets,
      instructions: [
        {
          prospectName: "@nicklopiccolo",
          instruction: "Reference the fundraising discussion.",
        },
      ],
    }),
    new Map([["prospect_1", "Reference the fundraising discussion."]])
  );
  assert.throws(
    () =>
      resolvePlanBatchTargetInstructions({
        targets,
        instructions: [
          {
            prospectName: "@nicklopiccolo",
            instruction: "Reuse @nickjohnston's launch angle.",
          },
        ],
      }),
    /contains Nick Johnston's details/
  );
});

test("unrelated plan changes cannot satisfy a batch item", () => {
  assert.deepEqual(
    resolvePlanBatchApplication({
      operation: "update",
      activePlan: { id: "plan_1", version: 3 },
      baselinePlanId: "plan_1",
      baselinePlanVersion: 2,
    }),
    { outcome: "skipped", reason: "plan_changed" }
  );
  assert.deepEqual(
    resolvePlanBatchApplication({
      operation: "update",
      activePlan: { id: "plan_1", version: 3 },
      baselinePlanId: "plan_1",
      baselinePlanVersion: 2,
      appliedPlanId: "plan_1",
      appliedPlanVersion: 3,
    }),
    { outcome: "succeeded", planId: "plan_1" }
  );
});
