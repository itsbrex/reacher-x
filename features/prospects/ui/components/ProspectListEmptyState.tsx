"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export interface ProspectListEmptyStateProps {
  title: string;
  description: string;
  icon: ReactNode;
  className?: string;
}

export function ProspectListEmptyState({
  title,
  description,
  icon,
  className,
}: ProspectListEmptyStateProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "flex min-h-[280px] items-center justify-center px-3 py-16 text-center",
        className
      )}
    >
      <div className="max-w-[28rem]">
        <div className="border-border/70 bg-muted/30 text-muted-foreground mx-auto mb-3 flex size-10 items-center justify-center rounded-md border">
          {icon}
        </div>
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground mt-1.5 text-pretty text-sm leading-6">
          {description}
        </p>
      </div>
    </section>
  );
}
