import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assessAutoPlanGrounding,
  autoPlanDraftSchema,
  autoPlanTransportSchema,
  classifyAutoPlanFailure,
  isAutoPlanFailureRecoveryEligible,
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

test("workpool completion verifies persistence before completed status", () => {
  const workflowSource = readFileSync(
    `${ROOT}/convex/workflows/autoPlan.ts`,
    "utf8"
  );
  const completionIndex = workflowSource.indexOf('status: "completed"');
  assert.match(workflowSource, /persistedPlan\.tasks\.length > 0/);
  assert.ok(
    workflowSource.indexOf("persistedPlan.tasks.length") < completionIndex
  );
  assert.match(workflowSource, /handleAutoPlanWorkComplete/);
  assert.match(workflowSource, /upsertNotificationByKey/);

  const actionSource = readFileSync(
    `${ROOT}/convex/outreachActions.ts`,
    "utf8"
  );
  assert.match(actionSource, /outreachPlanPool\.enqueueAction/);
  assert.match(actionSource, /retry: true/);

  const enrichmentSource = readFileSync(
    `${ROOT}/convex/workflows/enrichment.ts`,
    "utf8"
  );
  assert.doesNotMatch(enrichmentSource, /status: "generating"/);
});

test("automatic generation caches successful grounding stages and isolates agent history", () => {
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
  assert.match(actionSource, /saveMessages: "none"/);
  assert.match(actionSource, /saveAutoPlanGroundingStageInternal/);
  assert.match(actionSource, /recentMessages: 0/);
  assert.match(actionSource, /textSearch: false/);
  assert.match(actionSource, /vectorSearch: false/);
  assert.match(actionSource, /schema: autoPlanTransportSchema/);

  const strictValidationIndex = actionSource.indexOf(
    "autoPlanDraftSchema.parse(generated.object)"
  );
  const planCreationIndex = actionSource.lastIndexOf(
    "internal.outreach.createPlan"
  );
  const visibleThreadIndex = actionSource.lastIndexOf(
    "ensureVisibleAutoPlanThread"
  );
  assert.ok(strictValidationIndex < planCreationIndex);
  assert.ok(planCreationIndex < visibleThreadIndex);
});

test("provider transport schema stays compatible while app validation remains strict", () => {
  const invalidDraft = {
    strategy: {
      rationale: "",
      valueProposition: "",
      tone: "",
    },
    tasks: [],
  };

  assert.equal(autoPlanTransportSchema.safeParse(invalidDraft).success, true);
  assert.equal(autoPlanDraftSchema.safeParse(invalidDraft).success, false);
});

test("automatic plan failures distinguish terminal setup issues from transient providers", () => {
  assert.deepEqual(
    classifyAutoPlanFailure("Workspace writing style is not ready"),
    {
      code: "writing_style_unavailable",
      retryable: false,
      userMessage:
        "Writing style is unavailable. Refresh it from Connected accounts.",
      actionLabel: "Reconnect",
      targetHref: "/settings/connected-accounts",
    }
  );
  assert.equal(
    classifyAutoPlanFailure("Provider returned 503").retryable,
    true
  );
  assert.equal(
    classifyAutoPlanFailure("Unsupported minLength").retryable,
    false
  );
  assert.deepEqual(classifyAutoPlanFailure("SocialAPI: Insufficient balance"), {
    code: "provider_balance_unavailable",
    retryable: false,
    userMessage: "We’ll try again automatically.",
  });
  assert.equal(
    isAutoPlanFailureRecoveryEligible("provider_balance_unavailable"),
    true
  );
  assert.equal(
    isAutoPlanFailureRecoveryEligible("grounding_unavailable"),
    true
  );
  assert.equal(isAutoPlanFailureRecoveryEligible("reconnect_required"), false);
  assert.equal(
    isAutoPlanFailureRecoveryEligible("writing_style_unavailable"),
    false
  );
});

test("automatic plan reliability prevents repeated paid work and dead notification actions", () => {
  const actionSource = readFileSync(
    `${ROOT}/convex/autoPlanActions.ts`,
    "utf8"
  );
  assert.ok(
    actionSource.indexOf('mode: "platform_profile"') <
      actionSource.indexOf("readWebPages(")
  );
  assert.ok(
    actionSource.indexOf('mode: "posts"') <
      actionSource.lastIndexOf("runDeepResearch(")
  );

  const workflowSource = readFileSync(
    `${ROOT}/convex/workflows/autoPlan.ts`,
    "utf8"
  );
  assert.match(workflowSource, /Couldn’t create a plan for/);
  assert.doesNotMatch(workflowSource, /View details/);

  const monitorSource = readFileSync(
    `${ROOT}/convex/socialapiMonitors.ts`,
    "utf8"
  );
  assert.match(monitorSource, /keywords\.twitterSocialQueries/);
  assert.doesNotMatch(
    monitorSource,
    /for \(const query of keywords\.socialQueries\)/
  );

  const prospectSource = readFileSync(`${ROOT}/convex/prospects.ts`, "utf8");
  assert.match(prospectSource, /prospect\.planGenerationStatus !== "idle"/);
});

test("auto-plan history hides legacy blank threads", () => {
  const chatSource = readFileSync(`${ROOT}/convex/chat.ts`, "utf8");
  assert.match(chatSource, /isAutoPlanHistoryRow/);
  assert.match(chatSource, /hasVisibleMessagesByThreadId/);
  assert.match(chatSource, /role === "user" \|\| role === "assistant"/);
});
