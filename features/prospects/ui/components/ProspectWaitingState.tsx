"use client";

import { getProspectWaitingStateCopy } from "@/features/prospects/lib/prospectEmptyStateCopy";
import { AgentWorkingMark } from "@/shared/ui/components/AgentWorkingMark";
import { Button } from "@/shared/ui/components/Button";

export interface ProspectWaitingStateProps {
  entityPlural: string;
  onViewAnalytics: () => void;
}

export function ProspectWaitingState({
  entityPlural,
  onViewAnalytics,
}: ProspectWaitingStateProps) {
  const copy = getProspectWaitingStateCopy({ entityPlural });

  return (
    <section
      aria-label={copy.message}
      className="flex min-h-[300px] items-start justify-center px-4 pt-16 pb-16 text-center sm:pt-20"
    >
      <div className="flex max-w-[42rem] flex-col items-center">
        <AgentWorkingMark />
        <p className="text-foreground mt-6 text-sm font-medium text-pretty">
          {copy.message}
        </p>
        <Button
          type="button"
          size="xs"
          className="mt-5"
          onClick={onViewAnalytics}
        >
          View progress
        </Button>
      </div>
    </section>
  );
}
