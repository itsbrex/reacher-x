import assert from "node:assert/strict";
import test from "node:test";
import {
  filterProspectInteractionHistory,
  normalizeConversationMessage,
  normalizePublicInteraction,
} from "../convex/lib/prospectInteractionHistoryCore";

test("normalizes DMs and public interactions into one agent-safe shape", () => {
  const dm = normalizeConversationMessage({
    platform: "twitter",
    direction: "received",
    createdAtMs: 300,
    text: "  Interested—send me the details.  ",
  });
  const comment = normalizePublicInteraction({
    platform: "linkedin",
    interactionType: "comment_reply_posted",
    direction: "outgoing",
    repliedAt: 200,
    replyText: "Thanks, I will send the breakdown.",
    sourceUrl: "https://www.linkedin.com/feed/update/example",
  });

  assert.deepEqual(dm, {
    kind: "dm",
    platform: "twitter",
    direction: "received",
    occurredAt: 300,
    text: "Interested—send me the details.",
    status: "received",
    attachmentCount: 0,
  });
  assert.deepEqual(comment, {
    kind: "comment",
    platform: "linkedin",
    direction: "sent",
    occurredAt: 200,
    text: "Thanks, I will send the breakdown.",
    context: undefined,
    url: "https://www.linkedin.com/feed/update/example",
    status: "active",
    attachmentCount: 0,
  });
});

test("filters interaction history dynamically and keeps newest items first", () => {
  const result = filterProspectInteractionHistory({
    items: [
      {
        kind: "reply",
        platform: "twitter",
        direction: "sent",
        occurredAt: 100,
        text: "Older reply",
        attachmentCount: 0,
      },
      {
        kind: "dm",
        platform: "twitter",
        direction: "received",
        occurredAt: 300,
        text: "Newest DM",
        attachmentCount: 0,
      },
      {
        kind: "comment",
        platform: "linkedin",
        direction: "received",
        occurredAt: 200,
        text: "LinkedIn comment",
        attachmentCount: 0,
      },
    ],
    platform: "all",
    kinds: ["dm", "comment", "reply"],
    direction: "received",
    limit: 1,
  });

  assert.equal(result.truncated, true);
  assert.deepEqual(
    result.items.map((item) => item.text),
    ["Newest DM"]
  );
});
