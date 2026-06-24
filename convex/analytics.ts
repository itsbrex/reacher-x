import { query } from "./lib/functionBuilders";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUTCTimestamp } from "../shared/lib/utils/time/timeUtils";
import { analyticsDateRangeValidator } from "./validators";
import { getOwnedWorkspace, getUserByIdentity } from "./lib/accessHelpers";
import {
  buildMetric,
  buildPipelineFunnel,
  countHourlyFieldByBucket,
  createEmptyAnalyticsData,
  createTrendBucketSet,
  isTimestampInWindow,
  normalizeAnalyticsWindow,
  calculateRate,
  sumHourlyFieldInWindow,
  type AnalyticsQueryResult,
  type TimeWindow,
} from "./lib/analyticsCore";
import {
  getQualificationScoreBucket,
  getUtcDayStartTimestamp,
} from "./lib/readModelHelpers";
import { listWorkspaceAnalyticsDailyRows } from "./workspaceAnalyticsDaily";
import { isProspectActionableReady } from "./lib/prospectAnalyticsCore";
import {
  getNumberProperty,
  getStringProperty,
  isRecord,
} from "./lib/typeGuards";

type ProspectRow = Pick<
  Doc<"prospects">,
  | "_id"
  | "_creationTime"
  | "platform"
  | "status"
  | "pipelineStage"
  | "stageTimestamps"
  | "updatedAt"
  | "qualificationScore"
  | "qualificationStatus"
  | "evidencePosts"
  | "painPoints"
  | "finance"
>;
type WorkflowEventRow = Pick<
  Doc<"memoryWorkflowEvents">,
  "eventType" | "occurredAt" | "payload" | "prospectId"
>;

type QualificationOutcome = "qualified" | "disqualified" | "pending";

type ProspectCohortSnapshot = {
  totalCount: number;
  pendingCount: number;
  qualifiedCount: number;
  readyCount: number;
  disqualifiedCount: number;
  pipelineFunnel: ReturnType<typeof buildPipelineFunnel>;
  qualificationDistribution: Array<{
    segment: "qualified" | "disqualified" | "pending";
    count: number;
  }>;
  fitDistribution: Array<{
    range: "0-49" | "50-69" | "70-79" | "80-100";
    count: number;
  }>;
  platformDistribution: Array<{
    platform: "Twitter/X" | "LinkedIn" | "Reddit" | "Threads" | "Bluesky";
    count: number;
  }>;
};

function createErrorResult(
  message: string,
  bucketSet: ReturnType<typeof createTrendBucketSet>
): AnalyticsQueryResult {
  return {
    status: "error",
    error: message,
    data: createEmptyAnalyticsData(bucketSet),
    generatedAt: getCurrentUTCTimestamp(),
  };
}

function getWindowDayRange(window: TimeWindow) {
  const clampedEndMs = Math.max(window.startMs, window.endMs - 1);
  return {
    startDayStartUtcMs: getUtcDayStartTimestamp(window.startMs),
    endDayStartUtcMs: getUtcDayStartTimestamp(clampedEndMs),
  };
}

function getStageRank(
  stage: ProspectRow["status"] | ProspectRow["pipelineStage"]
) {
  switch (stage) {
    case "contacted":
      return 1;
    case "in_progress":
      return 2;
    case "converted":
      return 3;
    default:
      return 0;
  }
}

function getLatestQualificationStatesByProspect(
  workflowEvents: WorkflowEventRow[],
  asOfMs: number
) {
  const states = new Map<
    string,
    {
      outcome: QualificationOutcome;
      score?: number;
    }
  >();

  const relevantEvents = workflowEvents
    .filter(
      (event) =>
        event.eventType === "qualification_completed" &&
        event.prospectId &&
        event.occurredAt <= asOfMs
    )
    .sort((left, right) => left.occurredAt - right.occurredAt);

  for (const event of relevantEvents) {
    if (!event.prospectId) {
      continue;
    }

    const payload = isRecord(event.payload) ? event.payload : undefined;
    const qualifiedValue = payload?.qualified;
    const outcome: QualificationOutcome =
      qualifiedValue === true
        ? "qualified"
        : qualifiedValue === false
          ? "disqualified"
          : "pending";

    states.set(String(event.prospectId), {
      outcome,
      score: getNumberProperty(payload, "score"),
    });
  }

  return states;
}

function getSuccessfulEnrichmentByProspect(
  workflowEvents: WorkflowEventRow[],
  asOfMs: number
) {
  const enrichedProspects = new Set<string>();

  for (const event of workflowEvents) {
    if (
      event.eventType !== "enrichment_completed" ||
      !event.prospectId ||
      event.occurredAt > asOfMs
    ) {
      continue;
    }

    const payload = isRecord(event.payload) ? event.payload : undefined;
    const enrichmentStatus = getStringProperty(payload, "enrichmentStatus");
    if (enrichmentStatus === "failed") {
      continue;
    }

    enrichedProspects.add(String(event.prospectId));
  }

  return enrichedProspects;
}

function hasReachedStageByEnd(
  prospect: ProspectRow,
  stage: "contacted" | "in_progress" | "converted",
  asOfMs: number
) {
  const stageTimestamp = prospect.stageTimestamps?.[stage];
  if (typeof stageTimestamp === "number") {
    return stageTimestamp <= asOfMs;
  }

  const currentStage = prospect.pipelineStage ?? prospect.status;
  return (
    getStageRank(currentStage) >= getStageRank(stage) &&
    prospect.updatedAt <= asOfMs
  );
}

function buildProspectCohortSnapshot(args: {
  prospects: ProspectRow[];
  workflowEvents: WorkflowEventRow[];
  asOfMs: number;
}): ProspectCohortSnapshot {
  const qualificationStates = getLatestQualificationStatesByProspect(
    args.workflowEvents,
    args.asOfMs
  );
  const enrichedProspects = getSuccessfulEnrichmentByProspect(
    args.workflowEvents,
    args.asOfMs
  );

  let contactedCount = 0;
  let inProgressCount = 0;
  let convertedCount = 0;
  let qualifiedCount = 0;
  let disqualifiedCount = 0;
  let readyCount = 0;

  const fitCounts: ProspectCohortSnapshot["fitDistribution"] = [
    { range: "0-49", count: 0 },
    { range: "50-69", count: 0 },
    { range: "70-79", count: 0 },
    { range: "80-100", count: 0 },
  ];
  const platformCounts: ProspectCohortSnapshot["platformDistribution"] = [
    { platform: "Twitter/X", count: 0 },
    { platform: "LinkedIn", count: 0 },
    { platform: "Reddit", count: 0 },
    { platform: "Threads", count: 0 },
    { platform: "Bluesky", count: 0 },
  ];

  for (const prospect of args.prospects) {
    if (hasReachedStageByEnd(prospect, "contacted", args.asOfMs)) {
      contactedCount += 1;
    }
    if (hasReachedStageByEnd(prospect, "in_progress", args.asOfMs)) {
      inProgressCount += 1;
    }
    if (hasReachedStageByEnd(prospect, "converted", args.asOfMs)) {
      convertedCount += 1;
    }

    const qualificationState = qualificationStates.get(String(prospect._id));
    const outcome = qualificationState?.outcome ?? "pending";
    if (outcome === "qualified") {
      qualifiedCount += 1;
    } else if (outcome === "disqualified") {
      disqualifiedCount += 1;
    }

    const enrichmentStatus = enrichedProspects.has(String(prospect._id))
      ? "enriched"
      : "pending";
    const ready =
      outcome === "qualified" &&
      enrichedProspects.has(String(prospect._id)) &&
      isProspectActionableReady({
        platform: prospect.platform,
        qualificationStatus: "qualified",
        enrichmentStatus,
        evidencePosts: prospect.evidencePosts,
        painPoints: prospect.painPoints,
        finance: prospect.finance,
      });
    if (ready) {
      readyCount += 1;
    }

    const fitBucket = getQualificationScoreBucket(
      qualificationState?.score ?? prospect.qualificationScore
    );
    const fitIndex =
      fitBucket === "0-49"
        ? 0
        : fitBucket === "50-69"
          ? 1
          : fitBucket === "70-79"
            ? 2
            : 3;
    fitCounts[fitIndex].count += 1;

    if (prospect.platform === "twitter") {
      platformCounts[0].count += 1;
    } else if (prospect.platform === "linkedin") {
      platformCounts[1].count += 1;
    }
  }

  const pendingCount = Math.max(
    0,
    args.prospects.length - qualifiedCount - disqualifiedCount
  );

  return {
    totalCount: args.prospects.length,
    pendingCount,
    qualifiedCount,
    readyCount,
    disqualifiedCount,
    pipelineFunnel: buildPipelineFunnel({
      newCount: args.prospects.length,
      contactedCount,
      inProgressCount,
      convertedCount,
    }),
    qualificationDistribution: [
      { segment: "qualified", count: qualifiedCount },
      { segment: "disqualified", count: disqualifiedCount },
      { segment: "pending", count: pendingCount },
    ],
    fitDistribution: fitCounts,
    platformDistribution: platformCounts,
  };
}

export const getDashboardAnalytics = query({
  args: {
    workspaceId: v.id("workspaces"),
    range: analyticsDateRangeValidator,
    timeZone: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
    // Allows explicit retry from the UI by changing args.
    refreshKey: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<AnalyticsQueryResult> => {
    let bucketSet = createTrendBucketSet(
      normalizeAnalyticsWindow({ range: "7d", timeZone: args.timeZone })
    );

    try {
      let normalizedWindow = normalizeAnalyticsWindow({
        range: args.range,
        timeZone: args.timeZone,
        from: args.from,
        to: args.to,
        fromDate: args.fromDate,
        toDate: args.toDate,
      });
      bucketSet = createTrendBucketSet(normalizedWindow);

      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return createErrorResult("Not authenticated", bucketSet);
      }

      const user = await getUserByIdentity(ctx, identity);
      if (!user) {
        return createErrorResult("User not found", bucketSet);
      }

      const workspace = await getOwnedWorkspace(
        ctx,
        args.workspaceId,
        user._id
      );
      if (!workspace) {
        return createErrorResult(
          "Workspace not found or access denied",
          bucketSet
        );
      }

      normalizedWindow = normalizeAnalyticsWindow({
        range: args.range,
        timeZone: workspace.reportingTimeZone ?? args.timeZone,
        from: args.from,
        to: args.to,
        fromDate: args.fromDate,
        toDate: args.toDate,
      });
      bucketSet = createTrendBucketSet(normalizedWindow);

      const currentDayRange = getWindowDayRange(normalizedWindow.current);
      const previousDayRange = getWindowDayRange(normalizedWindow.previous);
      const startDayStartUtcMs = Math.min(
        currentDayRange.startDayStartUtcMs,
        previousDayRange.startDayStartUtcMs
      );
      const endDayStartUtcMs = Math.max(
        currentDayRange.endDayStartUtcMs,
        previousDayRange.endDayStartUtcMs
      );
      const earliestWindowStartMs = Math.min(
        normalizedWindow.current.startMs,
        normalizedWindow.previous.startMs
      );
      const latestWindowEndMs = Math.max(
        normalizedWindow.current.endMs,
        normalizedWindow.previous.endMs
      );

      const [analyticsRows, workspaceProspects, workflowEvents] =
        await Promise.all([
          listWorkspaceAnalyticsDailyRows({
            db: ctx.db,
            workspaceId: args.workspaceId,
            startDayStartUtcMs,
            endDayStartUtcMs,
          }),
          ctx.db
            .query("prospects")
            .withIndex("by_workspace", (q) =>
              q.eq("workspaceId", args.workspaceId)
            )
            .collect()
            .then((rows) =>
              rows.filter(
                (row) =>
                  row._creationTime >= earliestWindowStartMs &&
                  row._creationTime < latestWindowEndMs
              )
            ),
          ctx.db
            .query("memoryWorkflowEvents")
            .withIndex("by_workspace_occurred_at", (q) =>
              q
                .eq("workspaceId", args.workspaceId)
                .gte("occurredAt", earliestWindowStartMs)
                .lte("occurredAt", latestWindowEndMs)
            )
            .collect(),
        ]);

      const currentProspectsCount = sumHourlyFieldInWindow(
        analyticsRows,
        "hourlyNewProspectsCounts",
        normalizedWindow.current
      );
      const previousProspectsCount = sumHourlyFieldInWindow(
        analyticsRows,
        "hourlyNewProspectsCounts",
        normalizedWindow.previous
      );
      const newProspects = buildMetric({
        currentValue: currentProspectsCount,
        previousValue: previousProspectsCount,
      });

      const contactedCurrent = sumHourlyFieldInWindow(
        analyticsRows,
        "hourlyContactedEventsCounts",
        normalizedWindow.current
      );
      const contactedPrevious = sumHourlyFieldInWindow(
        analyticsRows,
        "hourlyContactedEventsCounts",
        normalizedWindow.previous
      );
      const respondedCurrent = sumHourlyFieldInWindow(
        analyticsRows,
        "hourlyRespondedEventsCounts",
        normalizedWindow.current
      );
      const respondedPrevious = sumHourlyFieldInWindow(
        analyticsRows,
        "hourlyRespondedEventsCounts",
        normalizedWindow.previous
      );

      const responseRateCurrent = calculateRate(
        respondedCurrent,
        contactedCurrent
      );
      const responseRatePrevious = calculateRate(
        respondedPrevious,
        contactedPrevious
      );
      const responseRate = {
        ...buildMetric({
          currentValue: responseRateCurrent,
          previousValue: responseRatePrevious,
          valueDecimals: 1,
          changeDecimals: 2,
          changePercentDecimals: 2,
        }),
        contacted: contactedCurrent,
      };

      const pendingPlansCurrent = sumHourlyFieldInWindow(
        analyticsRows,
        "hourlyDraftPlansCounts",
        normalizedWindow.current
      );
      const pendingPlansPrevious = sumHourlyFieldInWindow(
        analyticsRows,
        "hourlyDraftPlansCounts",
        normalizedWindow.previous
      );
      const pendingTasksCurrent = sumHourlyFieldInWindow(
        analyticsRows,
        "hourlyPendingApprovalTasksCounts",
        normalizedWindow.current
      );
      const pendingTasksPrevious = sumHourlyFieldInWindow(
        analyticsRows,
        "hourlyPendingApprovalTasksCounts",
        normalizedWindow.previous
      );
      const pendingApprovals = {
        ...buildMetric({
          currentValue: pendingPlansCurrent + pendingTasksCurrent,
          previousValue: pendingPlansPrevious + pendingTasksPrevious,
        }),
        plans: pendingPlansCurrent,
        tasks: pendingTasksCurrent,
      };

      const pausedPlansCurrent =
        sumHourlyFieldInWindow(
          analyticsRows,
          "hourlyPausedPlansCounts",
          normalizedWindow.current
        ) +
        sumHourlyFieldInWindow(
          analyticsRows,
          "hourlyBlockedAuthPlansCounts",
          normalizedWindow.current
        );
      const pausedPlansPrevious =
        sumHourlyFieldInWindow(
          analyticsRows,
          "hourlyPausedPlansCounts",
          normalizedWindow.previous
        ) +
        sumHourlyFieldInWindow(
          analyticsRows,
          "hourlyBlockedAuthPlansCounts",
          normalizedWindow.previous
        );
      const failedTasksCurrent = sumHourlyFieldInWindow(
        analyticsRows,
        "hourlyFailedTasksCounts",
        normalizedWindow.current
      );
      const failedTasksPrevious = sumHourlyFieldInWindow(
        analyticsRows,
        "hourlyFailedTasksCounts",
        normalizedWindow.previous
      );

      const issuesMetricBase = buildMetric({
        currentValue: pausedPlansCurrent + failedTasksCurrent,
        previousValue: pausedPlansPrevious + failedTasksPrevious,
        trendWhenEqual: "down",
      });
      const issuesTrend: "up" | "down" =
        issuesMetricBase.change <= 0 ? "down" : "up";
      const issues = {
        ...issuesMetricBase,
        trend: issuesTrend,
        paused: pausedPlansCurrent,
        failed: failedTasksCurrent,
      };

      const currentCohort = workspaceProspects.filter((prospect) =>
        isTimestampInWindow(prospect._creationTime, normalizedWindow.current)
      );
      const previousCohort = workspaceProspects.filter((prospect) =>
        isTimestampInWindow(prospect._creationTime, normalizedWindow.previous)
      );
      const currentSnapshot = buildProspectCohortSnapshot({
        prospects: currentCohort,
        workflowEvents,
        asOfMs: normalizedWindow.current.endMs,
      });
      const previousSnapshot = buildProspectCohortSnapshot({
        prospects: previousCohort,
        workflowEvents,
        asOfMs: normalizedWindow.previous.endMs,
      });
      const processingSummary = {
        pending: buildMetric({
          currentValue: currentSnapshot.pendingCount,
          previousValue: previousSnapshot.pendingCount,
        }),
        qualified: buildMetric({
          currentValue: currentSnapshot.qualifiedCount,
          previousValue: previousSnapshot.qualifiedCount,
        }),
        ready: buildMetric({
          currentValue: currentSnapshot.readyCount,
          previousValue: previousSnapshot.readyCount,
        }),
        disqualified: buildMetric({
          currentValue: currentSnapshot.disqualifiedCount,
          previousValue: previousSnapshot.disqualifiedCount,
          trendWhenEqual: "down",
        }),
      };

      const pipelineFunnel = currentSnapshot.pipelineFunnel;

      const prospectCounts = countHourlyFieldByBucket(
        analyticsRows,
        "hourlyNewProspectsCounts",
        bucketSet
      );
      const contactedCounts = countHourlyFieldByBucket(
        analyticsRows,
        "hourlyContactedEventsCounts",
        bucketSet
      );
      const trendsOverTime = bucketSet.buckets.map((bucket, index) => ({
        date: bucket.label,
        prospects: prospectCounts[index] ?? 0,
        contacted: contactedCounts[index] ?? 0,
      }));

      const qualificationDistribution =
        currentSnapshot.qualificationDistribution;
      const fitDistribution = currentSnapshot.fitDistribution;
      const platformDistribution = currentSnapshot.platformDistribution;

      const data = {
        newProspects,
        responseRate,
        pendingApprovals,
        issues,
        processingSummary,
        pipelineFunnel,
        trendsOverTime,
        qualificationDistribution,
        fitDistribution,
        platformDistribution,
      };

      return {
        status: "success",
        data,
        generatedAt: getCurrentUTCTimestamp(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load analytics data";

      return createErrorResult(errorMessage, bucketSet);
    }
  },
});
