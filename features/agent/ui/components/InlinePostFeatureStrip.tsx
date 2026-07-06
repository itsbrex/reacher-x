"use client";

import * as React from "react";
import { Button } from "@/shared/ui/components/Button";
import { InlineFeatureStrip } from "@/shared/ui/components/InlineFeatureStrip";
import { ChangeHistoryIcon, OpenInNewIcon } from "@/shared/ui/components/icons";

export interface InlinePostFeatureStripProps {
  title: string;
  context?: string | null;
  interactive?: boolean | null;
  onOpenPanel?: () => void;
}

export function InlinePostFeatureStrip({
  title,
  context,
  interactive = true,
  onOpenPanel,
}: InlinePostFeatureStripProps) {
  const canOpen = interactive !== false;

  return (
    <InlineFeatureStrip
      leading={
        <>
          <div className="border-border rounded-md border p-1">
            <ChangeHistoryIcon className="text-foreground size-4 fill-current" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{title} →</div>
            {context ? (
              <div className="text-muted-foreground truncate text-xs">
                {context}
              </div>
            ) : null}
          </div>
        </>
      }
      trailing={
        canOpen ? (
          <>
            <Button size="xs" onClick={onOpenPanel}>
              View
            </Button>
            <Button size="xsIcon" variant="outline" onClick={onOpenPanel}>
              <OpenInNewIcon className="fill-current" />
            </Button>
          </>
        ) : null
      }
    />
  );
}
