import assert from "node:assert/strict";
import test from "node:test";
import { buildAgentComposerSubmission } from "../features/agent/lib/buildAgentComposerMessage.ts";
import { parseLegacyAgentMessageContent } from "../shared/lib/mentions/messageContext.ts";

test("buildAgentComposerSubmission returns plain input when no references are attached", () => {
  assert.deepEqual(
    buildAgentComposerSubmission({
      input: "Draft a reply",
    }),
    {
      prompt: "Draft a reply",
      metadata: null,
    }
  );
});

test("buildAgentComposerSubmission keeps the visible prompt clean and moves refs into metadata", () => {
  const submission = buildAgentComposerSubmission({
    input: "Use these references.",
    taggedEntities: [
      {
        id: "plan:abc",
        entityId: "abc",
        kind: "plan",
        label: "Plan for Jane Doe",
        mentionText: "Plan: Jane Doe",
        secondaryLabel: "approved plan",
        avatarUrl: null,
        verified: false,
        planId: "abc",
        prospectId: "prospect_1",
      },
      {
        id: "task:def",
        entityId: "def",
        kind: "task",
        label: "Task 2: Send follow-up DM",
        mentionText: "Task 2: Send follow-up DM",
        secondaryLabel: "dm task",
        avatarUrl: null,
        verified: false,
        taskId: "def",
        planId: "abc",
        prospectId: "prospect_1",
      },
    ],
    attachments: [
      {
        uploadId: "upload_1",
        fileName: "candidates-use-case.jpg",
        mediaUrl: "https://cdn.example.com/candidates-use-case.jpg",
      },
    ],
  });

  assert.equal(submission?.prompt, "Use these references.");
  assert.equal(submission?.metadata?.promptTextSource, "user");
  assert.equal(submission?.metadata?.taggedEntities.length, 2);
  assert.equal(submission?.metadata?.attachments.length, 1);
  assert.doesNotMatch(
    submission?.prompt ?? "",
    /Tagged entities|planId|taskId/
  );
});

test("buildAgentComposerSubmission creates a synthetic fallback prompt for attachment-only turns", () => {
  const submission = buildAgentComposerSubmission({
    input: "   ",
    attachments: [
      {
        uploadId: "upload_1",
        fileName: "candidates-use-case.jpg",
        mediaUrl: "https://cdn.example.com/candidates-use-case.jpg",
      },
    ],
  });

  assert.equal(submission?.prompt, "Attached candidates-use-case.jpg");
  assert.equal(submission?.metadata?.promptTextSource, "synthetic");
  assert.equal(submission?.metadata?.attachments.length, 1);
});

test("buildAgentComposerSubmission normalizes sparse post mentions into exact hidden refs", () => {
  const submission = buildAgentComposerSubmission({
    input: "Show me this again.",
    taggedEntities: [
      {
        id: "post:twitter:2048451868171370763",
        entityId: "2048451868171370763",
        kind: "post",
        label: "@LoganTGott I wish LinkedIn",
        mentionText: "Post: @LoganTGott I wish LinkedIn",
        secondaryLabel: "X post • @LoganTGott",
        avatarUrl: null,
        verified: false,
      },
    ],
  });

  assert.equal(submission?.prompt, "Show me this again.");
  assert.equal(submission?.metadata?.taggedEntities.length, 1);
  assert.equal(
    submission?.metadata?.taggedEntities[0]?.postUrl,
    "https://x.com/i/status/2048451868171370763"
  );
  assert.equal(
    submission?.metadata?.taggedEntities[0]?.referenceText,
    "Post: @LoganTGott I wish LinkedIn (platform: twitter; postId: 2048451868171370763; url: https://x.com/i/status/2048451868171370763)"
  );
});

test("parseLegacyAgentMessageContent strips raw ids from legacy tagged prompts for display", () => {
  const parsed = parseLegacyAgentMessageContent(`delete plan
Tagged entities (treat these as explicit references for this request):
- Prospect: Logan Gott (prospectId: p176f4dnyvcz402a5r5zh4r1x9890hbb; workspaceId: kx76rdcnakhr70c412w9ptkh4n8907fk; handle: @LoganTGott)
- Plan: Plan for Logan Gott (planId: ph7f6w7nz0tr6qr0d93dg9ptyh899jf7; prospectId: p176f4dnyvcz402a5r5zh4r1x9890hbb; workspaceId: kx76rdcnakhr70c412w9ptkh4n8907fk; status: draft)
- Post: Hiring researchers with recent analytics migration experience (platform: linkedin; postId: urn:li:ugcPost:123456789; url: https://www.linkedin.com/feed/update/urn:li:ugcPost:123456789/; prospectId: p176f4dnyvcz402a5r5zh4r1x9890hbb)`);

  assert.equal(parsed?.displayText, "delete plan");
  assert.equal(parsed?.metadata.taggedEntities.length, 3);
  assert.deepEqual(
    parsed?.metadata.taggedEntities.map((entity) => ({
      kind: entity.kind,
      label: entity.label,
      secondaryLabel: entity.secondaryLabel,
    })),
    [
      {
        kind: "prospect",
        label: "Logan Gott",
        secondaryLabel: "@LoganTGott",
      },
      {
        kind: "plan",
        label: "Plan for Logan Gott",
        secondaryLabel: "draft plan",
      },
      {
        kind: "post",
        label: "Hiring researchers with recent analytics migration experience",
        secondaryLabel: "LinkedIn post",
      },
    ]
  );
});
