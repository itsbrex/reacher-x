import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assessAutoPlanGrounding,
  validateAutoPlanDraftAgainstGrounding,
  type AutoPlanDraft,
  type AutoPlanGroundingContext,
} from "../convex/lib/autoPlanCore";

const ROOT = process.cwd();

function createGroundingContext(
  overrides: Partial<AutoPlanGroundingContext> = {}
): AutoPlanGroundingContext {
  return {
    generatedAt: 1,
    workspace: {
      name: "Workspace",
      description: "We help developer-tool teams improve onboarding.",
      useCaseKey: "sales",
      icps: [
        {
          title: "Developer-tool founder",
          description: "Early-stage founder improving activation.",
          painPoints: ["Low activation"],
          channels: ["twitter"],
        },
      ],
      connectedAccounts: {
        x: { username: "owner", status: "connected", subscriptionType: null },
        linkedin: null,
      },
      agentSettings: { autonomyMode: "supervised" },
    },
    prospectProfileContext: "Founder of a developer tool with onboarding work.",
    storedSignalCount: 2,
    writingStyle: "Direct, concise, and practical.",
    freshPlatformProfile: { name: "Prospect" },
    recentPosts: [
      {
        id: "fresh-post-1",
        platform: "twitter",
        createdAt: 1,
        textPreview: "We are improving onboarding this month.",
      },
    ],
    websiteResearch: [],
    webResearch: [
      {
        query: "Prospect onboarding",
        findings: [
          {
            title: "Product update",
            url: "https://example.com/update",
            snippet: "The team launched a new onboarding flow.",
          },
        ],
      },
    ],
    retrievalErrors: [],
    ...overrides,
  };
}

function createValidDraft(): AutoPlanDraft {
  return {
    strategy: {
      rationale: "Their current onboarding initiative matches the offering.",
      targetTweetId: "fresh-post-1",
      valueProposition: "Share a practical activation improvement.",
      tone: "Direct and useful",
    },
    tasks: [
      {
        type: "comment",
        description: "Add a useful observation to the onboarding post.",
        timing: { type: "immediate" },
        targetTweetId: "fresh-post-1",
        content:
          "The shorter first-run path is a strong move—especially the early win.",
      },
    ],
  };
}

test("automatic plan eligibility starts at score 80", () => {
  const source = readFileSync(`${ROOT}/convex/lib/outreachCore.ts`, "utf8");
  assert.match(source, /AUTO_PLAN_GENERATION_THRESHOLD = 80/);
});

test("grounding requires workspace, ICP, stored signals, style, fresh profile, and research", () => {
  assert.deepEqual(assessAutoPlanGrounding(createGroundingContext()), {
    ready: true,
  });

  const incomplete = createGroundingContext({
    workspace: {
      ...createGroundingContext().workspace,
      description: "",
      icps: [],
    },
    storedSignalCount: 0,
    writingStyle: "",
    freshPlatformProfile: null,
    websiteResearch: [],
    webResearch: [],
  });
  const assessment = assessAutoPlanGrounding(incomplete);
  assert.equal(assessment.ready, false);
  if (!assessment.ready) {
    assert.equal(assessment.reasons.length, 6);
  }
});

test("plan validation rejects invented post IDs and empty outreach", () => {
  const hallucinated = createValidDraft();
  hallucinated.tasks[0].targetTweetId = "invented-post";
  assert.match(
    validateAutoPlanDraftAgainstGrounding({
      draft: hallucinated,
      recentPosts: createGroundingContext().recentPosts,
    }).join(" "),
    /not freshly retrieved/
  );

  const noOutreach = createValidDraft();
  noOutreach.strategy.targetTweetId = undefined;
  noOutreach.tasks = [
    {
      type: "wait",
      description: "Wait for a relevant post.",
      timing: { type: "event", value: "next_post" },
    },
  ];
  assert.match(
    validateAutoPlanDraftAgainstGrounding({
      draft: noOutreach,
      recentPosts: [],
    }).join(" "),
    /at least one comment or DM/
  );
});

test("durable workflow verifies persistence before completed status", () => {
  const workflowSource = readFileSync(
    `${ROOT}/convex/workflows/autoPlan.ts`,
    "utf8"
  );
  const completionIndex = workflowSource.indexOf('status: "completed"');
  assert.match(workflowSource, /persistedPlan\.tasks\.length === 0/);
  assert.ok(
    workflowSource.indexOf("persistedPlan.tasks.length") < completionIndex
  );
  assert.match(workflowSource, /handleAutoPlanWorkflowComplete/);
  assert.match(workflowSource, /status === "failed"/);

  const enrichmentSource = readFileSync(
    `${ROOT}/convex/workflows/enrichment.ts`,
    "utf8"
  );
  assert.doesNotMatch(enrichmentSource, /status: "generating"/);
});

test("automatic generation always requests mandatory fresh context", () => {
  const actionSource = readFileSync(
    `${ROOT}/convex/autoPlanActions.ts`,
    "utf8"
  );
  assert.match(actionSource, /mode: "platform_profile"/);
  assert.match(actionSource, /mode: "posts"/);
  assert.match(actionSource, /readWebPages/);
  assert.match(actionSource, /runDeepResearch/);
  assert.match(actionSource, /assessAutoPlanGrounding/);
  assert.match(actionSource, /generateObject/);
});
