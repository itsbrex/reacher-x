"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";

interface UsageTooltipMetricRowProps {
  color: string;
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}

export function UsageTooltipMetricRow({
  color,
  label,
  value,
  className,
}: UsageTooltipMetricRowProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-[2px] border"
        style={{ backgroundColor: color, borderColor: color }}
      />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-mono font-medium tabular-nums">
        {value}
      </span>
    </div>
  );
}
