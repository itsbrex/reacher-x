import assert from "node:assert/strict";
import test from "node:test";
import { resolveAgentThreadInitializationMode } from "../features/agent/lib/agentThreadInitialization.ts";

test("explicit thread routes keep loading the selected thread", () => {
  assert.equal(
    resolveAgentThreadInitializationMode({
      threadId: "thread_123",
      prospectId: null,
      shouldResolveSetupBootstrap: false,
    }),
    "explicitThread"
  );
});

test("prospect routes without a thread stay in draft mode", () => {
  assert.equal(
    resolveAgentThreadInitializationMode({
      threadId: null,
      prospectId: "prospect_123",
      shouldResolveSetupBootstrap: false,
    }),
    "prospectDraft"
  );
});

test("setup route without a persisted thread resolves to setup bootstrap", () => {
  assert.equal(
    resolveAgentThreadInitializationMode({
      threadId: null,
      prospectId: null,
      shouldResolveSetupBootstrap: true,
    }),
    "setupBootstrap"
  );
});

test("workspace /agent without a thread stays a draft composer", () => {
  assert.equal(
    resolveAgentThreadInitializationMode({
      threadId: null,
      prospectId: null,
      shouldResolveSetupBootstrap: false,
    }),
    "workspaceDraft"
  );
});
