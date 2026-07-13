import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveAgentThreadInitializationMode,
  shouldSyncAgentThreadToRoute,
} from "../features/agent/lib/agentThreadInitialization";

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

test("a cached route does not restore the thread that was just cleared", () => {
  assert.equal(
    shouldSyncAgentThreadToRoute({
      effectiveThreadId: "thread_previous",
      routeThreadId: null,
      staleThreadId: "thread_previous",
      isSetupRoute: false,
    }),
    false
  );
});

test("a newly generated thread still syncs after a stale thread was cleared", () => {
  assert.equal(
    shouldSyncAgentThreadToRoute({
      effectiveThreadId: "thread_new",
      routeThreadId: null,
      staleThreadId: "thread_previous",
      isSetupRoute: false,
    }),
    true
  );
});

test("an explicit or setup thread is never redundantly synced", () => {
  assert.equal(
    shouldSyncAgentThreadToRoute({
      effectiveThreadId: "thread_current",
      routeThreadId: "thread_current",
      staleThreadId: null,
      isSetupRoute: false,
    }),
    false
  );
  assert.equal(
    shouldSyncAgentThreadToRoute({
      effectiveThreadId: "thread_setup",
      routeThreadId: null,
      staleThreadId: null,
      isSetupRoute: true,
    }),
    false
  );
});
