import type { ReactNode } from "react";
import { Card, CardContent } from "@/shared/ui/components/Card";
import { Progress } from "@/shared/ui/components/Progress";
import { cn } from "@/shared/lib/utils";

export interface InlineProgressCardProps {
  title: string;
  progress: number;
  status: ReactNode;
  headerAction?: ReactNode;
  footerAction?: ReactNode;
  className?: string;
}

export function InlineProgressCard({
  title,
  progress,
  status,
  headerAction,
  footerAction,
  className,
}: InlineProgressCardProps) {
  return (
    <Card
      className={cn(
        "border-border overflow-hidden rounded-xl border shadow-none",
        className
      )}
    >
      <CardContent className="space-y-3 p-4">
        <header className="flex items-start justify-between gap-2">
          <h3 className="text-foreground min-w-0 flex-1 text-sm font-semibold">
            {title}
          </h3>
          {headerAction}
        </header>

        <Progress
          className="h-0.5 rounded-none"
          indicatorClassName="bg-foreground rounded-none"
          value={Math.max(0, Math.min(100, progress))}
        />

        <footer className="flex items-center justify-between gap-2">
          <div className="text-muted-foreground min-w-0 text-xs">{status}</div>
          {footerAction}
        </footer>
      </CardContent>
    </Card>
  );
}
