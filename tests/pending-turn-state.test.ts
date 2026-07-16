import assert from "node:assert/strict";
import test from "node:test";
import {
  isPlanBatchTurnWaiting,
  updatePendingTurnPhase,
} from "../features/agent/lib/pendingTurnState";

test("keeps plan batch turns pending until the Agent response completes", () => {
  assert.equal(
    isPlanBatchTurnWaiting({
      status: "running",
      agentResponseCompleted: false,
    }),
    true
  );
  assert.equal(
    isPlanBatchTurnWaiting({
      status: "completed",
      agentResponseCompleted: false,
    }),
    true
  );
  assert.equal(
    isPlanBatchTurnWaiting({
      status: "completed",
      agentResponseCompleted: true,
    }),
    false
  );
  assert.equal(isPlanBatchTurnWaiting(null), false);
});

test("returns the same pending turn when the phase is already current", () => {
  const pendingTurn = {
    id: "pending-turn-1",
    phase: "streaming",
    prompt: "hello",
  };

  const result = updatePendingTurnPhase(
    pendingTurn,
    pendingTurn.id,
    "streaming"
  );

  assert.strictEqual(result, pendingTurn);
});

test("does not overwrite a stopping pending turn with a later phase", () => {
  const pendingTurn = {
    id: "pending-turn-1",
    phase: "stopping",
    prompt: "hello",
  };

  const result = updatePendingTurnPhase(
    pendingTurn,
    pendingTurn.id,
    "streaming"
  );

  assert.strictEqual(result, pendingTurn);
});

test("updates the phase when the pending turn is still active", () => {
  const pendingTurn = {
    id: "pending-turn-1",
    phase: "queued",
    prompt: "hello",
  };

  const result = updatePendingTurnPhase(
    pendingTurn,
    pendingTurn.id,
    "streaming"
  );

  assert.notStrictEqual(result, pendingTurn);
  assert.deepEqual(result, {
    ...pendingTurn,
    phase: "streaming",
  });
});

test("ignores updates for a different pending turn id", () => {
  const pendingTurn = {
    id: "pending-turn-1",
    phase: "queued",
    prompt: "hello",
  };

  const result = updatePendingTurnPhase(
    pendingTurn,
    "pending-turn-2",
    "streaming"
  );

  assert.strictEqual(result, pendingTurn);
});
