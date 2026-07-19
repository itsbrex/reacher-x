import { type Infer } from "convex/values";
import { prospectingBootstrapCompletionReasonValidator } from "../validators";

export type ProspectingBootstrapCompletionReason = Infer<
  typeof prospectingBootstrapCompletionReasonValidator
>;

export type ProspectingScheduleMode =
  | "accelerated_discovery"
  | "in_flight_wait"
  | "provider_wait"
  | "steady_state";

export type ProspectingSchedulingConfig = {
  steadyStateIntervalMs: number;
  bootstrap: {
    readyTarget: number;
    intervalMs: number;
    maxCycles: number;
    noProgressTimeoutMs: number;
    pendingQualificationYieldPercent: number;
  };
};

export type ProspectingBootstrapProgress = {
  bootstrapLastProgressAt: number;
  bootstrapLastReadyCount: number;
  bootstrapLastQualifiedCount: number;
  bootstrapLastEnrichedCount: number;
  bootstrapLastPendingQualificationCount: number;
  bootstrapLastPendingEnrichmentCount: number;
};

export type ProspectingScheduleDecision = {
  mode: ProspectingScheduleMode;
  delayMs: number;
  projectedReadyCount: number;
  bootstrapProgress?: ProspectingBootstrapProgress;
  bootstrapCompletionReason?: ProspectingBootstrapCompletionReason;
};

export function getProjectedProspectingReadyCount(args: {
  readyCount: number;
  pendingQualificationCount: number;
  qualifiedPendingEnrichmentCount: number;
  pendingQualificationYieldPercent: number;
}) {
  const projectedQualified = Math.floor(
    Math.max(0, args.pendingQualificationCount) *
      (Math.max(0, args.pendingQualificationYieldPercent) / 100)
  );

  return (
    Math.max(0, args.readyCount) +
    Math.max(0, args.qualifiedPendingEnrichmentCount) +
    projectedQualified
  );
}

export function decideProspectingSchedule(args: {
  now: number;
  bootstrapStartedAt?: number;
  bootstrapCompletedAt?: number;
  bootstrapCycleCount: number;
  bootstrapLastProgressAt?: number;
  bootstrapLastReadyCount?: number;
  bootstrapLastQualifiedCount?: number;
  bootstrapLastEnrichedCount?: number;
  bootstrapLastPendingQualificationCount?: number;
  bootstrapLastPendingEnrichmentCount?: number;
  readyCount: number;
  qualifiedCount: number;
  enrichedCount: number;
  pendingQualificationCount: number;
  qualifiedPendingEnrichmentCount: number;
  providerRetryAfterAt?: number;
  cycleCompleted?: boolean;
  config: ProspectingSchedulingConfig;
}): ProspectingScheduleDecision {
  const projectedReadyCount = getProjectedProspectingReadyCount({
    readyCount: args.readyCount,
    pendingQualificationCount: args.pendingQualificationCount,
    qualifiedPendingEnrichmentCount: args.qualifiedPendingEnrichmentCount,
    pendingQualificationYieldPercent:
      args.config.bootstrap.pendingQualificationYieldPercent,
  });
  const steadyStateDecision: ProspectingScheduleDecision = {
    mode: "steady_state",
    delayMs: args.config.steadyStateIntervalMs,
    projectedReadyCount,
  };

  if (
    args.bootstrapStartedAt === undefined ||
    args.bootstrapCompletedAt !== undefined
  ) {
    return steadyStateDecision;
  }

  const hasProgressBaseline =
    args.bootstrapLastProgressAt !== undefined &&
    args.bootstrapLastReadyCount !== undefined &&
    args.bootstrapLastQualifiedCount !== undefined &&
    args.bootstrapLastEnrichedCount !== undefined &&
    args.bootstrapLastPendingQualificationCount !== undefined &&
    args.bootstrapLastPendingEnrichmentCount !== undefined;
  const hasMeaningfulProgress =
    args.cycleCompleted === true ||
    !hasProgressBaseline ||
    args.readyCount > (args.bootstrapLastReadyCount ?? 0) ||
    args.qualifiedCount > (args.bootstrapLastQualifiedCount ?? 0) ||
    args.enrichedCount > (args.bootstrapLastEnrichedCount ?? 0) ||
    args.pendingQualificationCount <
      (args.bootstrapLastPendingQualificationCount ?? 0) ||
    args.qualifiedPendingEnrichmentCount <
      (args.bootstrapLastPendingEnrichmentCount ?? 0);
  const bootstrapLastProgressAt = hasMeaningfulProgress
    ? args.now
    : (args.bootstrapLastProgressAt ?? args.bootstrapStartedAt);
  const bootstrapProgress: ProspectingBootstrapProgress = {
    bootstrapLastProgressAt,
    bootstrapLastReadyCount: args.readyCount,
    bootstrapLastQualifiedCount: args.qualifiedCount,
    bootstrapLastEnrichedCount: args.enrichedCount,
    bootstrapLastPendingQualificationCount: args.pendingQualificationCount,
    bootstrapLastPendingEnrichmentCount: args.qualifiedPendingEnrichmentCount,
  };
  const withProgress = (
    decision: Omit<ProspectingScheduleDecision, "bootstrapProgress">
  ): ProspectingScheduleDecision => ({
    ...decision,
    bootstrapProgress,
  });

  if (args.readyCount >= args.config.bootstrap.readyTarget) {
    return withProgress({
      ...steadyStateDecision,
      bootstrapCompletionReason: "target_reached",
    });
  }

  if (args.bootstrapCycleCount >= args.config.bootstrap.maxCycles) {
    return withProgress({
      ...steadyStateDecision,
      bootstrapCompletionReason: "cycle_limit_reached",
    });
  }

  if (
    args.now - bootstrapLastProgressAt >=
    args.config.bootstrap.noProgressTimeoutMs
  ) {
    return withProgress({
      ...steadyStateDecision,
      bootstrapCompletionReason: "no_progress_timeout_reached",
    });
  }

  if (
    args.providerRetryAfterAt !== undefined &&
    args.providerRetryAfterAt > args.now
  ) {
    const noProgressDeadline =
      bootstrapLastProgressAt + args.config.bootstrap.noProgressTimeoutMs;
    return withProgress({
      mode: "provider_wait",
      delayMs: Math.min(
        Math.max(
          args.config.bootstrap.intervalMs,
          args.providerRetryAfterAt - args.now
        ),
        Math.max(0, noProgressDeadline - args.now)
      ),
      projectedReadyCount,
    });
  }

  if (projectedReadyCount >= args.config.bootstrap.readyTarget) {
    return withProgress({
      mode: "in_flight_wait",
      delayMs: args.config.bootstrap.intervalMs,
      projectedReadyCount,
    });
  }

  return withProgress({
    mode: "accelerated_discovery",
    delayMs: args.config.bootstrap.intervalMs,
    projectedReadyCount,
  });
}
