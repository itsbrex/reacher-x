import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateQualificationRate,
  getQualificationAuditApplicationDecision,
} from "../convex/lib/qualificationAuditApplyCore";

type DecisionArgs = Parameters<
  typeof getQualificationAuditApplicationDecision
>[0];

function item(
  overrides: Partial<DecisionArgs["item"]> = {}
): DecisionArgs["item"] {
  return {
    previousScore: 80,
    proposedScore: 52,
    proposedStatus: "disqualified",
    ...overrides,
  };
}

function prospect(
  overrides: Partial<NonNullable<DecisionArgs["prospect"]>> = {}
): NonNullable<DecisionArgs["prospect"]> {
  return {
    qualificationStatus: "qualified",
    qualificationScore: 80,
    ...overrides,
  };
}

test("audit application accepts an unchanged qualified prospect", () => {
  assert.deepEqual(
    getQualificationAuditApplicationDecision({
      item: item(),
      prospect: prospect(),
    }),
    { outcome: "apply" }
  );
});

test("audit application skips a prospect requalified after the snapshot", () => {
  assert.equal(
    getQualificationAuditApplicationDecision({
      item: item(),
      prospect: prospect({ qualificationScore: 91 }),
    }).outcome,
    "skip_stale"
  );
});

test("audit application recovers safely after a disqualification was committed", () => {
  assert.deepEqual(
    getQualificationAuditApplicationDecision({
      item: item(),
      prospect: prospect({
        qualificationStatus: "disqualified",
        qualificationScore: 52,
      }),
    }),
    { outcome: "recover_applied" }
  );
});

test("qualification-rate recomputation handles empty and populated queries", () => {
  assert.equal(calculateQualificationRate(4, 10), 40);
  assert.equal(calculateQualificationRate(4, 0), 0);
});
