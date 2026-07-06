import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMentionEntityContentSignature,
  getLocalMentionResults,
} from "../shared/lib/mentions/mentionSearch";
import type { MentionEntitySearchResult } from "../shared/lib/mentions/mentionEntities";

const LOGAN_ENTITY: MentionEntitySearchResult = {
  id: "prospect:logan",
  entityId: "logan",
  kind: "prospect",
  label: "Logan Gott",
  mentionText: "Logan Gott",
  secondaryLabel: "@LoganTGott",
  avatarUrl: null,
  verified: true,
  handle: "LoganTGott",
};

const POST_ENTITY: MentionEntitySearchResult = {
  id: "post:x:123",
  entityId: "123",
  kind: "post",
  label: "I wish LinkedIn",
  mentionText: "Post: I wish LinkedIn",
  secondaryLabel: "X post",
  avatarUrl: null,
  verified: false,
  postId: "123",
  postPlatform: "twitter",
  postUrl: "https://x.com/LoganTGott/status/123",
  prospectId: "logan",
};

const COMMENT_ENTITY: MentionEntitySearchResult = {
  id: "post:linkedin-comment:activity:123:comment:456",
  entityId: "comment:456",
  kind: "post",
  label: "Great breakdown on outbound sequencing.",
  mentionText: "Comment: Great breakdown on outbound sequencing.",
  secondaryLabel: "LinkedIn comment • Jane Founder",
  avatarUrl: null,
  verified: false,
  postId: "comment:456",
  postPlatform: "linkedin",
  postUrl:
    "https://www.linkedin.com/feed/update/urn:li:activity:123?commentUrn=urn:li:comment:(activity:123,456)",
  prospectId: "logan",
};

test("mention search signatures stay stable for equivalent entity arrays", () => {
  const firstSignature = buildMentionEntityContentSignature([
    LOGAN_ENTITY,
    POST_ENTITY,
  ]);
  const secondSignature = buildMentionEntityContentSignature([
    { ...LOGAN_ENTITY },
    { ...POST_ENTITY },
  ]);

  assert.equal(firstSignature, secondSignature);
});

test("local mention search matches people by label and handle", () => {
  const results = getLocalMentionResults({
    query: "logan",
    localEntities: [LOGAN_ENTITY, POST_ENTITY],
  });

  assert.deepEqual(
    results.map((entity) => entity.id),
    [LOGAN_ENTITY.id, POST_ENTITY.id]
  );
});

test("local mention search matches posts by URL", () => {
  const results = getLocalMentionResults({
    query: "status/123",
    localEntities: [LOGAN_ENTITY, POST_ENTITY, COMMENT_ENTITY],
  });

  assert.deepEqual(
    results.map((entity) => entity.id),
    [POST_ENTITY.id]
  );
});

test("local mention search matches comment-style entities by preview text", () => {
  const results = getLocalMentionResults({
    query: "outbound sequencing",
    localEntities: [LOGAN_ENTITY, POST_ENTITY, COMMENT_ENTITY],
  });

  assert.deepEqual(
    results.map((entity) => entity.id),
    [COMMENT_ENTITY.id]
  );
});
