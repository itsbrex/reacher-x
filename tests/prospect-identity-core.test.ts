import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildAutoPlanFailureNotificationTitle } from "../convex/lib/autoPlanCore";
import {
  getProspectDisplayLabel,
  getProspectIdentitySnapshot,
  type ProspectIdentitySource,
} from "../convex/lib/prospectIdentityCore";

const linkedInProspect = {
  data: {
    author: {
      name: "Tego AI",
      profilePictureURL: "https://media.licdn.com/tego-ai.jpg",
      url: "https://www.linkedin.com/company/tegoai/posts",
    },
  },
  displayName: undefined,
  platform: "linkedin",
  prospectType: "organization",
  socialProfiles: {
    linkedin: {
      url: "https://www.linkedin.com/company/tegoai/posts",
      urn: "urn:li:fsd_company:109214078",
      username: "tegoai",
    },
  },
} satisfies ProspectIdentitySource;

test("LinkedIn post prospects resolve their company name, logo, and username", () => {
  const identity = getProspectIdentitySnapshot(linkedInProspect);

  assert.equal(identity.displayName, "Tego AI");
  assert.equal(identity.preferredLabel, "Tego AI");
  assert.equal(identity.avatarUrl, "https://media.licdn.com/tego-ai.jpg");
  assert.equal(identity.linkedInUsername, "tegoai");
  assert.equal(identity.screenName, "tegoai");
  assert.equal(
    identity.profileUrl,
    "https://www.linkedin.com/company/tegoai/posts"
  );
  assert.equal(
    buildAutoPlanFailureNotificationTitle(identity.preferredLabel),
    "Couldn’t create a plan for Tego AI"
  );
});

test("stored names win and Twitter handles remain a readable fallback", () => {
  assert.equal(
    getProspectDisplayLabel({
      data: { user: { name: "Raw Name", screen_name: "raw_handle" } },
      displayName: "Stored Name",
      platform: "twitter",
      prospectType: "individual",
      socialProfiles: undefined,
    }),
    "Stored Name"
  );

  assert.equal(
    getProspectDisplayLabel({
      data: { user: { screen_name: "readable_handle" } },
      displayName: undefined,
      platform: "twitter",
      prospectType: "individual",
      socialProfiles: undefined,
    }),
    "@readable_handle"
  );
});

test("prospects without a readable identity use human copy, never an ID", () => {
  const prospect = {
    data: {},
    displayName: undefined,
    platform: "linkedin",
    prospectType: undefined,
    socialProfiles: undefined,
  } satisfies ProspectIdentitySource;

  assert.equal(getProspectDisplayLabel(prospect), "this prospect");
  assert.equal(
    buildAutoPlanFailureNotificationTitle(getProspectDisplayLabel(prospect)),
    "Couldn’t create a plan for this prospect"
  );
});

test("user-facing prospect paths do not use external IDs as names", () => {
  const files = [
    "convex/autoPlanActions.ts",
    "convex/autoPlanRuns.ts",
    "convex/chat.ts",
    "convex/interactions.ts",
    "convex/lib/prospectProfileContextCore.ts",
    "convex/mediaMentions.ts",
    "convex/outreach.ts",
    "convex/planBatchActions.ts",
    "convex/planBatches.ts",
    "convex/workflows/autoPlan.ts",
  ];

  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /externalId/, file);
  }
});

test("online migrations repair all persisted identity snapshots", () => {
  const source = readFileSync("convex/migrations.ts", "utf8");
  assert.match(source, /backfillAgentMailQualifiedProspectDisplayNames/);
  assert.match(source, /backfillReacherXQualifiedProspectDisplayNames/);
  assert.match(source, /repairOutreachNotificationProspectIdentity/);
  assert.match(source, /repairPlanBatchProspectNames/);
  assert.match(source, /batchSize: 25/g);
  assert.match(source, /by_workspace_qualification/);
  assert.match(source, /\.eq\("qualificationStatus", "qualified"\)/);
  assert.match(source, /creativecoder\.crco@gmail\.com/);
  assert.match(source, /ks76np202xg61bj94838cpszyn8arxc6/);
  assert.match(source, /ks76wdkah15gxj05hatyk5hxjx88y6dj/);
  assert.match(source, /prospectingWorkflowStatus !== "running"/);
  assert.match(source, /getDocumentSize\(\{ \.\.\.prospect, displayName \}\)/);
  assert.match(source, /MAX_SAFE_PROSPECT_DOCUMENT_BYTES/);
  assert.equal(
    source.match(/isScopedActiveIdentityRepairWorkspace\(/g)?.length,
    4,
    "every repair migration must use the active-workspace guard"
  );
});
