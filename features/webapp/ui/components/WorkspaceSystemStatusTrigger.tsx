"use client";

import { useState } from "react";
import { getWorkspaceSystemStatusDotClassName } from "@/features/webapp/lib/workspaceSystemStatusTone";
import { Button } from "@/shared/ui/components/Button";
import { ChangeHistoryIcon } from "@/shared/ui/components/icons";
import { cn } from "@/shared/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/components/Tooltip";
import {
  type WorkspaceSystemStatus,
  WorkspaceSystemStatusDialog,
  useWorkspaceSystemStatusCopy,
} from "@/features/webapp/ui/components/WorkspaceSystemStatusDialog";

interface WorkspaceSystemStatusTriggerProps {
  status: WorkspaceSystemStatus;
}

export function WorkspaceSystemStatusTrigger({
  status,
}: WorkspaceSystemStatusTriggerProps) {
  const statusCopy = useWorkspaceSystemStatusCopy(status);
  const [open, setOpen] = useState(false);

  const dotClassName = getWorkspaceSystemStatusDotClassName(status.mode);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={status.mode === "running" ? "ghost" : "outline"}
              size="xsIcon"
              aria-label={statusCopy.tooltip}
              onClick={() => setOpen(true)}
              className="relative"
            >
              <ChangeHistoryIcon
                aria-hidden="true"
                className="size-4 fill-current"
              />
              <span className="ring-background absolute top-0 right-0 size-2 translate-x-1/4 -translate-y-1/4 rounded-full ring-2">
                <span
                  className={cn("block size-full rounded-full", dotClassName)}
                />
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{statusCopy.tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <WorkspaceSystemStatusDialog
        open={open}
        onOpenChange={setOpen}
        status={status}
      />
    </>
  );
}
