"use client";

import * as React from "react";
import NumberFlow from "@number-flow/react";
import { cn } from "@/shared/lib/utils/utils";

export interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

/**
 * Animated character counter using @number-flow/react
 * - Color reflects state: muted < near-limit < over-limit
 * - Uses tabular numerals for alignment
 */
export function CharacterCounter({
  current,
  max,
  className,
}: CharacterCounterProps) {
  const isOverLimit = current > max;
  const isNearLimit = current > max * 0.8;

  const colorClass = isOverLimit
    ? "text-red-500"
    : isNearLimit
      ? "text-primary dark:text-primary"
      : "text-muted-foreground";

  return (
    <span
      className={cn("text-sm font-medium", colorClass, className)}
      aria-live="polite"
      aria-label={`${current} of ${max} characters used`}
    >
      <NumberFlow
        value={current}
        className="font-mono tabular-nums"
        style={
          {
            // Color for NumberFlow parts; supported via currentColor
            // See @number-flow/react README and d.ts for supported props
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore CSS var for runtime styling
            "--number-flow-color": "currentColor",
            fontVariantNumeric: "tabular-nums",
          } as React.CSSProperties
        }
        willChange={true}
      />
      <span className="font-mono tabular-nums">/{max}</span>
    </span>
  );
}

export default CharacterCounter;
