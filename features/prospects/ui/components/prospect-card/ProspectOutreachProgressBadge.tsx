"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import {
  resolveOutreachProgressPresentation,
  type OutreachProgressTone,
  type ProspectOutreachProgress,
} from "@/features/prospects/lib/outreachProgressUi";
import { cn } from "@/shared/lib/utils";
import { AsciiSpinnerText } from "@/shared/ui/components/AsciiSpinnerText";
import { Badge } from "@/shared/ui/components/Badge";
import { ChangeHistoryIcon } from "@/shared/ui/components/icons";

const INDICATOR_TONE_CLASS_NAMES: Record<OutreachProgressTone, string> = {
  active: "text-primary",
  attention: "text-amber-600 dark:text-amber-400",
  warning: "text-destructive",
  success: "text-emerald-600 dark:text-emerald-400",
  muted: "text-muted-foreground",
};

interface ProspectOutreachProgressBadgeProps {
  planGenerationStatus?: Doc<"prospects">["planGenerationStatus"];
  progress?: ProspectOutreachProgress;
  className?: string;
}

export function ProspectOutreachProgressBadge({
  planGenerationStatus,
  progress,
  className,
}: ProspectOutreachProgressBadgeProps) {
  const presentation = resolveOutreachProgressPresentation({
    planGenerationStatus,
    progress,
  });
  if (!presentation) {
    return null;
  }

  const spinnerVariant =
    presentation.indicator === "spinner" ||
    presentation.indicator === "pulse" ||
    presentation.indicator === "clock"
      ? presentation.indicator
      : null;

  return (
    <Badge
      variant="outline"
      className={cn("max-w-64", className)}
      title={presentation.title}
    >
      {spinnerVariant ? (
        <AsciiSpinnerText
          text={presentation.label}
          variant={spinnerVariant}
          className={cn(
            "[&>span:last-child]:text-foreground inline-flex min-w-0 items-center font-mono text-xs [&>span:last-child]:truncate",
            INDICATOR_TONE_CLASS_NAMES[presentation.tone]
          )}
        />
      ) : (
        <>
          <ChangeHistoryIcon
            className={cn(
              "size-3.5 shrink-0 fill-current",
              INDICATOR_TONE_CLASS_NAMES[presentation.tone]
            )}
            aria-hidden
          />
          <span className="truncate font-mono text-xs" role="status">
            {presentation.label}
          </span>
        </>
      )}
    </Badge>
  );
}
