"use client";

import AnimatedNumber from "@/shared/ui/components/AnimatedNumber";
import { AnimatedElapsedTimer } from "@/shared/ui/components/AnimatedElapsedTimer";
import { AsciiSpinnerText } from "@/shared/ui/components/AsciiSpinnerText";
import { cn } from "@/shared/lib/utils";
import {
  Timeline,
  TimelineContent,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/shared/ui/components/Timeline";

export type SetupPreviewProgress = {
  discoveredCount: number;
  qualifiedCount: number;
  enrichedCount: number;
  selectedCount: number;
};

interface SetupPreviewProgressTimelineProps {
  mode: "starting" | "discovering" | "searching";
  entityPlural: string;
  progress: SetupPreviewProgress;
  startedAt: number | null;
  stageStartedAt: number | null;
}

export function SetupPreviewProgressTimeline({
  mode,
  entityPlural,
  progress,
  startedAt,
  stageStartedAt,
}: SetupPreviewProgressTimelineProps) {
  const entityPluralLower = entityPlural.toLowerCase();
  const statusText =
    mode === "starting"
      ? "Starting search"
      : mode === "searching"
        ? "Search in progress"
        : "Live progress";
  const activeTitle =
    mode === "starting"
      ? "Starting preview search"
      : `Matching real ${entityPluralLower}`;
  const activeDescription =
    mode === "starting"
      ? `Agent is starting the first live search for real ${entityPluralLower}.`
      : mode === "searching"
        ? `Agent is still discovering, qualifying, and enriching ${entityPluralLower} for your preview.`
        : `Agent is discovering, qualifying, and enriching ${entityPluralLower} for your preview.`;
  const activeStartedAt = stageStartedAt ?? startedAt;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <AsciiSpinnerText
          text={statusText}
          className="text-foreground inline-flex min-w-0 text-sm font-medium"
        />
        <AnimatedElapsedTimer
          startedAt={activeStartedAt}
          className="text-muted-foreground shrink-0 text-xs"
        />
      </div>

      <Timeline defaultValue={2} orientation="vertical" className="pt-1">
        <TimelineItem
          step={1}
          className="group-data-[orientation=vertical]/timeline:ms-6 group-data-[orientation=vertical]/timeline:not-last:pb-6"
        >
          <TimelineHeader>
            <TimelineSeparator className="group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:h-[calc(100%-0.875rem)] group-data-[orientation=vertical]/timeline:translate-y-4" />
            <StageKnob state="complete" />
            <TimelineTitle className="text-sm">
              Ideal profiles approved
            </TimelineTitle>
          </TimelineHeader>
          <TimelineContent className="mt-1 text-xs">
            3 {entityPluralLower} profiles confirmed
          </TimelineContent>
        </TimelineItem>

        <TimelineItem
          step={2}
          className="group-data-[orientation=vertical]/timeline:ms-6 group-data-[orientation=vertical]/timeline:not-last:pb-6"
        >
          <TimelineHeader>
            <TimelineSeparator className="group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:h-[calc(100%-0.875rem)] group-data-[orientation=vertical]/timeline:translate-y-4" />
            <StageKnob state="active" />
            <TimelineTitle className="text-sm">{activeTitle}</TimelineTitle>
          </TimelineHeader>
          <TimelineContent className="mt-2 space-y-2">
            <p className="text-xs leading-5">{activeDescription}</p>
            <PreviewProgressStats progress={progress} />
          </TimelineContent>
        </TimelineItem>

        <TimelineItem
          step={3}
          className="group-data-[orientation=vertical]/timeline:ms-6 group-data-[orientation=vertical]/timeline:not-last:pb-0"
        >
          <TimelineHeader>
            <StageKnob state="upcoming" />
            <TimelineTitle className="text-muted-foreground text-sm">
              Preview {entityPluralLower}
            </TimelineTitle>
          </TimelineHeader>
          <TimelineContent className="mt-1 text-xs">
            {mode === "searching"
              ? "You can leave this screen and check back later"
              : `Profiles will appear here automatically when they’re ready`}
          </TimelineContent>
        </TimelineItem>
      </Timeline>
    </div>
  );
}

function StageKnob({ state }: { state: "complete" | "active" | "upcoming" }) {
  return (
    <TimelineIndicator
      className={cn(
        "group-data-[orientation=vertical]/timeline:top-0 group-data-[orientation=vertical]/timeline:-left-6",
        state === "complete" && "border-primary bg-primary",
        state === "active" && "border-primary bg-background",
        state === "upcoming" && "border-border bg-background"
      )}
    >
      {state === "active" ? (
        <span className="bg-primary absolute inset-1 rounded-full" />
      ) : null}
    </TimelineIndicator>
  );
}

function PreviewProgressStats({
  progress,
}: {
  progress: SetupPreviewProgress;
}) {
  return (
    <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:gap-x-6">
      <PreviewProgressStat
        label="Discovered"
        value={progress.discoveredCount}
      />
      <PreviewProgressStat label="Qualified" value={progress.qualifiedCount} />
      <PreviewProgressStat label="Enriched" value={progress.enrichedCount} />
      <PreviewProgressStat label="Ready" value={progress.selectedCount} />
    </dl>
  );
}

function PreviewProgressStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground font-mono text-sm tabular-nums">
        <AnimatedNumber value={value} animateOnMount />
      </dd>
    </div>
  );
}
