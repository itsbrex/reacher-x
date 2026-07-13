import assert from "node:assert/strict";
import test from "node:test";
import { getLatestUserMessageScrollAnchorKey } from "../features/agent/lib/agentMessageScrollHelpers";

test("only the latest persisted user turn anchors a transcript", () => {
  assert.equal(
    getLatestUserMessageScrollAnchorKey([
      { key: "user-1", role: "user" },
      { key: "assistant-1", role: "assistant" },
      { key: "user-2", role: "user" },
      { key: "assistant-2", role: "assistant" },
    ]),
    "user-2"
  );
});

test("a transcript without a user turn has no scroll anchor", () => {
  assert.equal(
    getLatestUserMessageScrollAnchorKey([
      { key: "assistant-1", role: "assistant" },
      { key: "tool-1", role: "tool" },
    ]),
    null
  );
});

test("an empty transcript has no scroll anchor", () => {
  assert.equal(getLatestUserMessageScrollAnchorKey([]), null);
});
