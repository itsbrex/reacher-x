"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getPlanBatchCopy } from "@/shared/lib/outreach/planBatchCopy";
import { InlineProgressCard } from "./InlineProgressCard";

type PlanBatchRunSummary = {
  operation: "create" | "update" | "create_or_update";
  scopeKind: "tagged" | "plan_group" | "named" | "all" | "fit_score";
  fitScoreMin?: number;
  fitScoreMax?: number;
  status:
    | "selecting"
    | "awaiting_confirmation"
    | "queued"
    | "running"
    | "completed"
    | "partial"
    | "failed"
    | "cancelled";
  targetCount: number;
  eligibleCount: number;
  succeededCount: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  skippedCount: number;
  selectionSkippedCount: number;
  finishedCount: number;
  targetNames: string[];
  issues: Array<{
    id: string;
    prospectName: string;
    reason: string;
  }>;
};

export function PlanBatchProgressCard({ runId }: { runId: string }) {
  const run = useQuery(api.planBatches.getPlanBatchRun, {
    runId: runId as Id<"planBatchRuns">,
  }) as PlanBatchRunSummary | null | undefined;

  if (run === undefined) {
    return (
      <InlineProgressCard
        title="Checking plan progress"
        progress={0}
        status="Loading progress..."
      />
    );
  }

  if (run === null) {
    return (
      <InlineProgressCard
        title="Plan progress is unavailable"
        progress={0}
        status="This progress update is no longer available."
      />
    );
  }

  const processedCount = run.selectionSkippedCount + run.finishedCount;
  const progress =
    run.targetCount > 0
      ? (processedCount / run.targetCount) * 100
      : run.status === "completed"
        ? 100
        : 0;
  const copy = getPlanBatchCopy(run);
  const showNamedIssues = run.eligibleCount > 0 && run.eligibleCount <= 2;
  return (
    <InlineProgressCard
      title={copy.title}
      progress={progress}
      status={
        <div className="space-y-1">
          <span className="tabular-nums">{copy.status}</span>
          {showNamedIssues
            ? run.issues.map((issue) => (
                <span key={issue.id} className="block">
                  {issue.prospectName}: {issue.reason}
                </span>
              ))
            : null}
        </div>
      }
    />
  );
}
