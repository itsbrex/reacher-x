"use client";

import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

interface AgentWorkspaceEmptyStateProps {
  children: ReactNode;
  isResolving: boolean;
}

export function AgentWorkspaceEmptyState({
  children,
  isResolving,
}: AgentWorkspaceEmptyStateProps) {
  return (
    <section aria-labelledby="agent-empty-state-title" className="py-6">
      <h2 id="agent-empty-state-title" className="sr-only">
        Start a conversation with △ Agent
      </h2>

      <div className="mb-4 flex justify-center" aria-hidden="true">
        <span
          className={cn(
            "agent-workspace-mark block font-mono text-[5rem] leading-none font-light",
            isResolving
              ? "agent-workspace-mark-resolving"
              : "agent-workspace-mark-ready"
          )}
        >
          △
        </span>
      </div>

      <div className="text-left">{children}</div>
    </section>
  );
}
