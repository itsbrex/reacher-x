import assert from "node:assert/strict";
import test from "node:test";
import { dedupeThreadHistoryLinksByThreadId } from "../convex/lib/threadHistoryHelpers";

test("dedupeThreadHistoryLinksByThreadId keeps the newest row per thread", () => {
  const deduped = dedupeThreadHistoryLinksByThreadId([
    {
      _creationTime: 1_000,
      threadId: "thread-1",
      threadStatus: "active" as const,
    },
    {
      _creationTime: 3_000,
      threadId: "thread-2",
      threadStatus: "active" as const,
    },
    {
      _creationTime: 2_000,
      threadId: "thread-1",
      threadStatus: "archived" as const,
    },
  ]);

  assert.deepEqual(deduped, [
    {
      _creationTime: 3_000,
      threadId: "thread-2",
      threadStatus: "active",
    },
    {
      _creationTime: 2_000,
      threadId: "thread-1",
      threadStatus: "archived",
    },
  ]);
});
