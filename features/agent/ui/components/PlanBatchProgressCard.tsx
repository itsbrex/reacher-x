"use client";

import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  getPlanBatchCopy,
  getPlanBatchTitleValues,
  type PlanBatchTitleValue,
} from "@/shared/lib/outreach/planBatchCopy";
import { AsciiSpinnerText } from "@/shared/ui/components/AsciiSpinnerText";
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

function PlanBatchActivityIndicator() {
  return (
    <span className="text-muted-foreground shrink-0" aria-hidden="true">
      <AsciiSpinnerText
        variant="spinner"
        className="block font-mono text-sm leading-5"
      />
    </span>
  );
}

function PlanBatchTitle({
  title,
  values,
}: {
  title: string;
  values: PlanBatchTitleValue[];
}) {
  if (values.length === 0) {
    return title;
  }

  const parts: ReactNode[] = [];
  let offset = 0;

  for (const value of values) {
    const valueStart = title.indexOf(value.text, offset);
    if (valueStart === -1) {
      return title;
    }

    parts.push(title.slice(offset, valueStart));
    parts.push(
      <span
        key={`${value.kind}-${value.text}-${valueStart}`}
        className={
          value.kind === "count"
            ? "text-muted-foreground font-mono font-semibold tabular-nums"
            : "text-muted-foreground"
        }
      >
        {value.text}
      </span>
    );
    offset = valueStart + value.text.length;
  }

  parts.push(title.slice(offset));
  return parts;
}

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
        headerAction={<PlanBatchActivityIndicator />}
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
  const titleValues = getPlanBatchTitleValues(run);
  const isActive =
    run.status === "selecting" ||
    run.status === "queued" ||
    run.status === "running";
  const showNamedIssues = run.eligibleCount > 0 && run.eligibleCount <= 2;
  return (
    <InlineProgressCard
      title={<PlanBatchTitle title={copy.title} values={titleValues} />}
      progress={progress}
      headerAction={isActive ? <PlanBatchActivityIndicator /> : undefined}
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
