import assert from "node:assert/strict";
import test from "node:test";
import {
  inferAttachmentMediaKind,
  isVisionAttachmentMediaKind,
} from "../shared/lib/utils/media/inferAttachmentMediaKind";

test("inferAttachmentMediaKind detects MIME-based image, gif, and video attachments", () => {
  assert.equal(inferAttachmentMediaKind({ mimeType: "image/png" }), "image");
  assert.equal(inferAttachmentMediaKind({ mimeType: "image/gif" }), "gif");
  assert.equal(inferAttachmentMediaKind({ mimeType: "video/mp4" }), "video");
});

test("inferAttachmentMediaKind falls back to URL/file extension heuristics", () => {
  assert.equal(
    inferAttachmentMediaKind({
      mimeType: "application/octet-stream",
      url: "https://cdn.example.com/screenshots/prospect-flow.webp?sig=123",
    }),
    "image"
  );
  assert.equal(
    inferAttachmentMediaKind({
      url: "operator-upload/follow-up-demo.mov",
    }),
    "video"
  );
  assert.equal(
    inferAttachmentMediaKind({
      url: "vision-reference.gif",
    }),
    "gif"
  );
  assert.equal(
    inferAttachmentMediaKind({
      url: "notes.txt",
    }),
    null
  );
});

test("isVisionAttachmentMediaKind only enables true visual media", () => {
  assert.equal(isVisionAttachmentMediaKind("image"), true);
  assert.equal(isVisionAttachmentMediaKind("gif"), true);
  assert.equal(isVisionAttachmentMediaKind("video"), false);
  assert.equal(isVisionAttachmentMediaKind(null), false);
});
