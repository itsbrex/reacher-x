"use client";

import { useId } from "react";

import { cn } from "@/shared/lib/utils";

interface AgentWorkingMarkProps {
  className?: string;
  isResolving?: boolean;
}

const AGENT_MARK_PATH = "M32 11 54 50H10Z";

export function AgentWorkingMark({
  className,
  isResolving = true,
}: AgentWorkingMarkProps) {
  const maskId = useId();

  return (
    <div
      className={cn("agent-working-mark size-16", className)}
      data-state={isResolving ? "resolving" : "ready"}
      aria-hidden="true"
    >
      <svg
        className="size-full overflow-visible"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask
            id={maskId}
            x="0"
            y="0"
            width="64"
            height="64"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
          >
            <rect width="64" height="64" fill="white" />
            <path className="agent-working-mark-gap" d={AGENT_MARK_PATH} />
          </mask>
        </defs>

        <path
          className="agent-working-mark-outline"
          d={AGENT_MARK_PATH}
          mask={`url(#${maskId})`}
        />
      </svg>
    </div>
  );
}
