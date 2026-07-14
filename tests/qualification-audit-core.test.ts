import assert from "node:assert/strict";
import test from "node:test";
import { mergeQualificationAuditEvidence } from "../convex/lib/qualificationAuditCore";
import {
  calculateQualificationScore,
  createEmptyQualificationScoreBreakdown,
} from "../convex/lib/qualificationScoringCore";
import {
  getUserPostSearchOutcome,
  isUserPostSearchSuccessful,
} from "../convex/lib/userPostSearchCore";

function createEvidence(postId: string) {
  return {
    platform: "twitter",
    ref: { platform: "twitter", postId, authorId: "prospect-1" },
    url: `https://x.com/prospect/status/${postId}`,
    textPreview: `Evidence ${postId}`,
  };
}

test("audit reuses existing evidence without labeling it refetched", () => {
  const result = mergeQualificationAuditEvidence({
    existing: [createEvidence("existing-1")],
    refetched: [],
  });

  assert.equal(result.origin, "existing");
  assert.equal(result.existingCount, 1);
  assert.equal(result.posts.length, 1);
});

test("audit merges and deduplicates refetched evidence by stable post ID", () => {
  const result = mergeQualificationAuditEvidence({
    existing: [createEvidence("same")],
    refetched: [createEvidence("same"), createEvidence("new")],
  });

  assert.equal(result.origin, "mixed");
  assert.deepEqual(
    result.posts.map((post) => (post.ref as { postId: string }).postId),
    ["same", "new"]
  );
});

test("audit labels provider-only evidence as refetched", () => {
  const result = mergeQualificationAuditEvidence({
    existing: [],
    refetched: [createEvidence("new")],
  });

  assert.equal(result.origin, "refetched");
});

test("zero provider matches are a successful no-results outcome", () => {
  const outcome = getUserPostSearchOutcome({ postCount: 0 });

  assert.equal(outcome, "no_results");
  assert.equal(isUserPostSearchSuccessful(outcome), true);
});

test("an actual provider error remains a failed search", () => {
  const outcome = getUserPostSearchOutcome({
    postCount: 0,
    error: "HTTP 503",
  });

  assert.equal(outcome, "error");
  assert.equal(isUserPostSearchSuccessful(outcome), false);
});

test("qualification score is calculated from bounded components", () => {
  assert.deepEqual(
    calculateQualificationScore({
      profileFit: 27,
      signalQuality: 24,
      intentStrength: 18,
      recency: 9,
    }),
    {
      profileFit: 27,
      signalQuality: 24,
      intentStrength: 18,
      recency: 9,
      total: 78,
    }
  );
  assert.equal(createEmptyQualificationScoreBreakdown().total, 0);
});
