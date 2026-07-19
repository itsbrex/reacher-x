import assert from "node:assert/strict";
import test from "node:test";
import {
  decideProspectingSchedule,
  type ProspectingSchedulingConfig,
} from "../convex/lib/prospectingSchedulingCore";
import { getSystemRuntimeConfig } from "../convex/lib/runtimeConfigHelpers";

const MINUTE_MS = 60_000;
const NOW = 6_000_000;

const schedulingConfig: ProspectingSchedulingConfig = {
  steadyStateIntervalMs: 60 * MINUTE_MS,
  bootstrap: {
    readyTarget: 12,
    intervalMs: 2 * MINUTE_MS,
    maxCycles: 8,
    noProgressTimeoutMs: 20 * MINUTE_MS,
    pendingQualificationYieldPercent: 30,
  },
};

function decide(
  overrides: Partial<Parameters<typeof decideProspectingSchedule>[0]> = {}
) {
  return decideProspectingSchedule({
    now: NOW,
    bootstrapStartedAt: NOW - 5 * MINUTE_MS,
    bootstrapCycleCount: 1,
    bootstrapLastProgressAt: NOW - 5 * MINUTE_MS,
    bootstrapLastReadyCount: 0,
    bootstrapLastQualifiedCount: 0,
    bootstrapLastEnrichedCount: 0,
    bootstrapLastPendingQualificationCount: 0,
    bootstrapLastPendingEnrichmentCount: 0,
    readyCount: 0,
    qualifiedCount: 0,
    enrichedCount: 0,
    pendingQualificationCount: 0,
    qualifiedPendingEnrichmentCount: 0,
    config: schedulingConfig,
    ...overrides,
  });
}

test("runtime defaults use the approved bootstrap and provider controls", () => {
  const config = getSystemRuntimeConfig({}, true);

  assert.equal(config.prospecting.autoReschedule, true);
  assert.equal(config.prospecting.steadyStateIntervalMs, 60 * MINUTE_MS);
  assert.deepEqual(config.prospecting.bootstrap, {
    readyTarget: 12,
    intervalMs: 2 * MINUTE_MS,
    maxCycles: 8,
    noProgressTimeoutMs: 20 * MINUTE_MS,
    pendingQualificationYieldPercent: 30,
  });
  assert.equal(config.providers.socialApi.requestsPerMinute, 500);
  assert.equal(config.providers.socialApi.targetRequestsPerMinute, 300);
  assert.equal(config.providers.linkdApi.requestsPerMinute, 30);
  assert.equal(config.providers.linkdApi.targetRequestsPerMinute, 24);
});

test("runtime values are live-configurable and safely clamped", () => {
  const config = getSystemRuntimeConfig(
    {
      PROSPECTING_BOOTSTRAP_READY_TARGET: "0",
      PROSPECTING_BOOTSTRAP_INTERVAL_MINUTES: "",
      PROSPECTING_BOOTSTRAP_MAX_CYCLES: "1000",
      PROSPECTING_BOOTSTRAP_NO_PROGRESS_TIMEOUT_MINUTES: "0",
      SOCIALAPI_REQUESTS_PER_MINUTE: "100",
      SOCIALAPI_TARGET_REQUESTS_PER_MINUTE: "300",
      QUALIFICATION_MAX_PARALLELISM: "0",
    },
    false
  );

  assert.equal(config.prospecting.bootstrap.readyTarget, 1);
  assert.equal(config.prospecting.bootstrap.intervalMs, 2 * MINUTE_MS);
  assert.equal(config.prospecting.bootstrap.maxCycles, 50);
  assert.equal(config.prospecting.bootstrap.noProgressTimeoutMs, MINUTE_MS);
  assert.equal(config.providers.socialApi.targetRequestsPerMinute, 100);
  assert.equal(config.workpools.qualification.maxParallelism, 1);
});

test("runs accelerated discovery while the projected target is not met", () => {
  const decision = decide();

  assert.equal(decision.mode, "accelerated_discovery");
  assert.equal(decision.delayMs, 2 * MINUTE_MS);
  assert.equal(decision.projectedReadyCount, 0);
  assert.equal(
    decision.bootstrapProgress?.bootstrapLastProgressAt,
    NOW - 5 * MINUTE_MS
  );
});

test("waits for viable in-flight prospects before discovering more", () => {
  const decision = decide({
    readyCount: 4,
    pendingQualificationCount: 10,
    qualifiedPendingEnrichmentCount: 5,
  });

  assert.equal(decision.mode, "in_flight_wait");
  assert.equal(decision.delayMs, 2 * MINUTE_MS);
  assert.equal(decision.projectedReadyCount, 12);
  assert.equal(decision.bootstrapProgress?.bootstrapLastProgressAt, NOW);
});

test("provider waits are bounded by the remaining no-progress window", () => {
  const decision = decide({
    bootstrapStartedAt: NOW - 60 * MINUTE_MS,
    bootstrapLastProgressAt: NOW - 18 * MINUTE_MS,
    providerRetryAfterAt: NOW + 10 * MINUTE_MS,
  });

  assert.equal(decision.mode, "provider_wait");
  assert.equal(decision.delayMs, 2 * MINUTE_MS);
});

test("moves to steady state once the ready target is met", () => {
  const decision = decide({ readyCount: 12 });

  assert.equal(decision.mode, "steady_state");
  assert.equal(decision.delayMs, 60 * MINUTE_MS);
  assert.equal(decision.projectedReadyCount, 12);
  assert.equal(decision.bootstrapCompletionReason, "target_reached");
});

test("eight completed cycles end accelerated scheduling", () => {
  assert.equal(
    decide({ bootstrapCycleCount: 8 }).bootstrapCompletionReason,
    "cycle_limit_reached"
  );
});

test("total elapsed time does not end bootstrap after recent progress", () => {
  const decision = decide({
    bootstrapStartedAt: NOW - 90 * MINUTE_MS,
    bootstrapLastProgressAt: NOW - 5 * MINUTE_MS,
  });

  assert.equal(decision.mode, "accelerated_discovery");
  assert.equal(decision.bootstrapCompletionReason, undefined);
});

test("a completed cycle resets the no-progress timer", () => {
  const decision = decide({
    bootstrapStartedAt: NOW - 90 * MINUTE_MS,
    bootstrapLastProgressAt: NOW - 25 * MINUTE_MS,
    cycleCompleted: true,
  });

  assert.equal(decision.mode, "accelerated_discovery");
  assert.equal(decision.bootstrapCompletionReason, undefined);
  assert.equal(decision.bootstrapProgress?.bootstrapLastProgressAt, NOW);
});

test("ready and qualification progress reset the no-progress timer", () => {
  const readyProgress = decide({
    bootstrapStartedAt: NOW - 90 * MINUTE_MS,
    bootstrapLastProgressAt: NOW - 25 * MINUTE_MS,
    bootstrapLastReadyCount: 2,
    readyCount: 3,
  });
  const qualificationProgress = decide({
    bootstrapStartedAt: NOW - 90 * MINUTE_MS,
    bootstrapLastProgressAt: NOW - 25 * MINUTE_MS,
    bootstrapLastQualifiedCount: 8,
    qualifiedCount: 9,
  });

  assert.equal(readyProgress.bootstrapCompletionReason, undefined);
  assert.equal(readyProgress.bootstrapProgress?.bootstrapLastProgressAt, NOW);
  assert.equal(qualificationProgress.bootstrapCompletionReason, undefined);
  assert.equal(
    qualificationProgress.bootstrapProgress?.bootstrapLastProgressAt,
    NOW
  );
});

test("enrichment progress resets the no-progress timer", () => {
  const decision = decide({
    bootstrapStartedAt: NOW - 90 * MINUTE_MS,
    bootstrapLastProgressAt: NOW - 25 * MINUTE_MS,
    bootstrapLastEnrichedCount: 6,
    enrichedCount: 7,
  });

  assert.equal(decision.bootstrapCompletionReason, undefined);
  assert.equal(decision.bootstrapProgress?.bootstrapLastProgressAt, NOW);
});

test("twenty minutes without meaningful progress ends acceleration", () => {
  const decision = decide({
    bootstrapStartedAt: NOW - 90 * MINUTE_MS,
    bootstrapLastProgressAt: NOW - 20 * MINUTE_MS,
  });

  assert.equal(decision.mode, "steady_state");
  assert.equal(
    decision.bootstrapCompletionReason,
    "no_progress_timeout_reached"
  );
});

test("older bootstrap records seed a progress baseline instead of timing out", () => {
  const decision = decide({
    bootstrapStartedAt: NOW - 90 * MINUTE_MS,
    bootstrapLastProgressAt: undefined,
    bootstrapLastReadyCount: undefined,
    bootstrapLastQualifiedCount: undefined,
    bootstrapLastEnrichedCount: undefined,
    bootstrapLastPendingQualificationCount: undefined,
    bootstrapLastPendingEnrichmentCount: undefined,
  });

  assert.equal(decision.mode, "accelerated_discovery");
  assert.equal(decision.bootstrapProgress?.bootstrapLastProgressAt, NOW);
});

test("existing workspaces without bootstrap state stay on the steady schedule", () => {
  assert.deepEqual(decide({ bootstrapStartedAt: undefined }), {
    mode: "steady_state",
    delayMs: 60 * MINUTE_MS,
    projectedReadyCount: 0,
  });
});
