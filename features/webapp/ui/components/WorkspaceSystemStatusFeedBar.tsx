"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { AnimatedElapsedTimer } from "@/shared/ui/components/AnimatedElapsedTimer";
import AnimatedNumber from "@/shared/ui/components/AnimatedNumber";
import { AsciiSpinnerText } from "@/shared/ui/components/AsciiSpinnerText";
import { ChangeHistoryIcon } from "@/shared/ui/components/icons";
import { cn } from "@/shared/lib/utils";
import {
  WorkspaceSystemStatusDialog,
  type WorkspaceSystemStatus,
} from "@/features/webapp/ui/components/WorkspaceSystemStatusDialog";

type OnboardingProgressLike = {
  found: number;
  actionableReadyCount: number;
  pendingCount?: number;
  notReadyCount?: number;
  pipelineStartedAt: number | null;
  pausedAt?: number | null;
};

function formatProspectLabel(count: number, state: "pending" | "not ready") {
  return `${count} prospect${count === 1 ? "" : "s"} ${state}`;
}

interface WorkspaceSystemStatusFeedBarProps {
  status: WorkspaceSystemStatus;
  progress: OnboardingProgressLike;
  className?: string;
}

export function WorkspaceSystemStatusFeedBar({
  status,
  progress,
  className,
}: WorkspaceSystemStatusFeedBarProps) {
  const [open, setOpen] = useState(false);

  const isPaused = status.mode === "paused";
  const statusText =
    status.mode === "paused"
      ? "Agent paused"
      : status.mode === "degraded"
        ? "Agent recovering"
        : status.mode === "attention"
          ? "Agent needs attention"
        : "Agent working";
  const pendingCount = Math.max(progress.pendingCount ?? 0, 0);
  const notReadyCount = Math.max(progress.notReadyCount ?? 0, 0);
  const detailText =
    pendingCount > 0 && notReadyCount > 0
      ? `${pendingCount} pending · ${notReadyCount} not ready`
      : pendingCount > 0
        ? formatProspectLabel(pendingCount, "pending")
        : notReadyCount > 0
          ? formatProspectLabel(notReadyCount, "not ready")
          : null;
  const label =
    detailText === null ? statusText : `${statusText} • ${detailText}`;
  const dotClassName =
    status.mode === "running"
      ? "bg-emerald-500"
      : status.mode === "attention"
        ? "bg-destructive"
        : "bg-amber-500";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className={cn(
          "bg-background border-border flex w-full min-w-0 items-center gap-2 rounded-[12px] border p-2 text-left",
          className
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="border-border relative shrink-0 rounded-md border p-1">
            <ChangeHistoryIcon className="text-foreground size-4 fill-current" />
            <span className="ring-background absolute top-0 right-0 size-2 translate-x-1/4 -translate-y-1/4 rounded-full ring-2">
              <span
                className={cn("block size-full rounded-full", dotClassName)}
              />
            </span>
          </div>
          <span className="min-w-0 truncate text-sm font-medium">
            <span>{statusText}</span>
            {detailText !== null ? (
              <>
                <span className="text-muted-foreground"> {" • "}</span>
                <span className="text-foreground font-mono tabular-nums">
                  {pendingCount > 0 && notReadyCount > 0 ? (
                    <>
                      <AnimatedNumber
                        value={pendingCount}
                        className="align-baseline text-sm"
                      />
                      {" pending · "}
                      <AnimatedNumber
                        value={notReadyCount}
                        className="align-baseline text-sm"
                      />
                      {" not ready"}
                    </>
                  ) : pendingCount > 0 ? (
                    <>
                      <AnimatedNumber
                        value={pendingCount}
                        className="align-baseline text-sm"
                      />
                      {pendingCount === 1
                        ? " prospect pending"
                        : " prospects pending"}
                    </>
                  ) : (
                    <>
                      <AnimatedNumber
                        value={notReadyCount}
                        className="align-baseline text-sm"
                      />
                      {notReadyCount === 1
                        ? " prospect not ready"
                        : " prospects not ready"}
                    </>
                  )}
                </span>
              </>
            ) : null}
          </span>
        </div>

        <div className="text-muted-foreground flex shrink-0 items-center gap-2 font-mono text-xs">
          <AnimatedElapsedTimer
            startedAt={progress.pipelineStartedAt}
            pausedAt={isPaused ? progress.pausedAt ?? null : null}
            className="text-muted-foreground text-xs"
          />
          {!isPaused ? (
            <AsciiSpinnerText
              className="text-muted-foreground font-mono text-sm"
            />
          ) : null}
          <div className="border-border text-foreground rounded-md border p-1">
            <ChevronRight className="size-4" aria-hidden />
          </div>
        </div>
      </button>

      <WorkspaceSystemStatusDialog
        open={open}
        onOpenChange={setOpen}
        status={status}
      />
    </>
  );
}
