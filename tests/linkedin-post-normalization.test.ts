import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLinkedInPost } from "../shared/lib/linkedin/post";

test("canonical LinkedIn posts preserve their wrapper and structured mentions", () => {
  const post = normalizeLinkedInPost({
    id: "urn:li:activity:123",
    platform: "linkedin",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:123/",
    author: { name: "Jane Doe" },
    text: "Jane mentioned Acme",
    createdAt: 123,
    raw: {
      textAttributes: [
        {
          text: "Acme",
          type: "companyMention",
          urn: "1035",
        },
      ],
    },
  });

  assert.equal(post?.id, "urn:li:activity:123");
  assert.equal(post?.platform, "linkedin");
  assert.equal(post?.author.name, "Jane Doe");
  assert.deepEqual(post?.raw, {
    textAttributes: [
      {
        text: "Acme",
        type: "companyMention",
        urn: "1035",
      },
    ],
  });
});

test("raw qualification-source posts receive a stable internal LinkedIn model", () => {
  const rawPost = {
    postID: "urn:li:activity:456",
    postURL: "https://www.linkedin.com/feed/update/urn:li:activity:456/",
    text: "A complete qualification source",
    author: {
      id: "person-1",
      name: "Jomel Layco",
      profilePictureURL: "https://media.licdn.com/avatar.jpg",
      url: "https://www.linkedin.com/in/jomel-layco/",
    },
    postedAt: { timestamp: 456 },
    engagements: {
      totalReactions: 7,
      commentsCount: 2,
      repostsCount: 1,
    },
  };

  const post = normalizeLinkedInPost(rawPost);

  assert.equal(post?.id, rawPost.postID);
  assert.equal(post?.url, rawPost.postURL);
  assert.equal(post?.text, rawPost.text);
  assert.equal(post?.author.name, "Jomel Layco");
  assert.equal(post?.metrics?.comments, 2);
  assert.equal(post?.raw, rawPost);
});
