import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveReasoningDisclosureOpen,
  resolveReasoningDisclosureRequest,
} from "../features/agent/lib/reasoningDisclosure";

test("analysis stays open for the full response stream", () => {
  assert.equal(
    resolveReasoningDisclosureOpen({
      isStreaming: true,
      completedOpen: false,
    }),
    true
  );
  assert.equal(
    resolveReasoningDisclosureRequest({
      isStreaming: true,
      currentCompletedOpen: false,
      requestedOpen: false,
    }),
    false
  );
});

test("analysis collapses when streaming completes and remains user-toggleable", () => {
  assert.equal(
    resolveReasoningDisclosureOpen({
      isStreaming: false,
      completedOpen: false,
    }),
    false
  );
  assert.equal(
    resolveReasoningDisclosureRequest({
      isStreaming: false,
      currentCompletedOpen: false,
      requestedOpen: true,
    }),
    true
  );
});
