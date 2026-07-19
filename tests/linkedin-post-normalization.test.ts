import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLinkedInCommentPreview,
  matchesLinkedInPostReference,
} from "../shared/lib/linkedin/comments";
import {
  getLinkedInResharedPost,
  normalizeLinkedInPost,
} from "../shared/lib/linkedin/post";
import {
  getWorkflowEvidencePostCreatedAt,
  sanitizeProspectEvidencePostsForWorkflow,
} from "../convex/lib/workflowSafeProspect";

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

test("LinkdAPI activity headers preserve the prospect's relationship to a post", () => {
  const rawPost = {
    urn: "urn:li:activity:789",
    header: "Lazar Jovanovic reposted this",
    text: "An original post from another account",
    author: {
      name: "O3",
      url: "https://www.linkedin.com/company/o3/",
    },
  };

  const post = normalizeLinkedInPost(rawPost);
  const [workflowPost] = sanitizeProspectEvidencePostsForWorkflow(
    [rawPost],
    "linkedin"
  );
  const rehydratedPost = normalizeLinkedInPost(workflowPost);

  assert.equal(post?.author.name, "O3");
  assert.equal(post?.activity?.type, "repost");
  assert.equal(post?.activity?.actor.name, "Lazar Jovanovic");
  assert.equal(rehydratedPost?.activity?.type, "repost");
  assert.equal(
    rehydratedPost?.activity?.actor.name,
    post?.activity?.actor.name
  );
});

test("LinkdAPI reaction headers normalize liked-post attribution", () => {
  const post = normalizeLinkedInPost({
    urn: "urn:li:activity:790",
    header: "Lazar Jovanovic likes this",
    text: "A liked post from another account",
    author: { name: "Another author" },
  });

  assert.equal(post?.activity?.type, "like");
  assert.equal(post?.activity?.actor.name, "Lazar Jovanovic");
});

test("reshared LinkedIn content survives workflow sanitization", () => {
  const rawPost = {
    urn: "urn:li:activity:791",
    text: "My take on this announcement",
    author: { name: "Lazar Jovanovic" },
    resharedPostContent: {
      urn: "urn:li:activity:792",
      url: "https://www.linkedin.com/feed/update/urn:li:activity:792",
      text: "The original announcement",
      author: { name: "O3" },
      postedAt: { timestamp: 792 },
    },
  };

  const [workflowPost] = sanitizeProspectEvidencePostsForWorkflow(
    [rawPost],
    "linkedin"
  );
  const resharedPost = getLinkedInResharedPost(workflowPost);

  assert.equal(resharedPost?.id, "urn:li:activity:792");
  assert.equal(resharedPost?.author.name, "O3");
  assert.equal(resharedPost?.text, "The original announcement");
});

test("LinkedIn activity ids recover missing provider timestamps", () => {
  const activityId = "7471179100469211136";
  const expectedTimestamp = 1781267905347;
  const rawPost = {
    urn: `urn:li:activity:${activityId}`,
    text: "A post whose provider timestamp was omitted",
    createdAt: 0,
  };

  const post = normalizeLinkedInPost(rawPost);
  const [workflowPost] = sanitizeProspectEvidencePostsForWorkflow(
    [rawPost],
    "linkedin"
  );

  assert.equal(post?.createdAt, expectedTimestamp);
  assert.ok(workflowPost);
  assert.equal(workflowPost?.createdAt, expectedTimestamp);
  assert.equal(
    getWorkflowEvidencePostCreatedAt(workflowPost),
    "2026-06-12T12:38:25.347Z"
  );
});

test("LinkedIn post references match numeric ids, URNs, and canonical URLs", () => {
  const post = {
    postID: "urn:li:activity:7483172695904333824",
    postURL:
      "https://www.linkedin.com/feed/update/urn:li:activity:7483172695904333824/",
  };

  assert.equal(matchesLinkedInPostReference(post, "7483172695904333824"), true);
  assert.equal(
    matchesLinkedInPostReference(
      { id: "7483172695904333824", platform: "linkedin" },
      "urn:li:activity:7483172695904333824"
    ),
    true
  );
  assert.equal(matchesLinkedInPostReference(post, "different-post"), false);
});

test("posted LinkedIn comment previews use the established comment contract", () => {
  const comment = buildLinkedInCommentPreview({
    id: "comment-1",
    postId: "post-1",
    text: "A posted comment",
    author: { name: "Viewer", isViewer: true },
  });

  assert.equal(comment.source, "preview");
  assert.equal(comment.text, "A posted comment");
  assert.equal(comment.canReact, false);
  assert.equal(comment.canReply, false);
});
