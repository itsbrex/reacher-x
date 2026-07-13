import type { WorkspaceSystemMode } from "@/shared/lib/workspaceSystem";

const WORKSPACE_SYSTEM_STATUS_DOT_CLASS_NAME = {
  running: "bg-emerald-500",
  degraded: "bg-amber-500",
  paused: "bg-muted-foreground",
  attention: "bg-destructive",
} as const satisfies Record<WorkspaceSystemMode, string>;

export function getWorkspaceSystemStatusDotClassName(
  mode: WorkspaceSystemMode
): string {
  return WORKSPACE_SYSTEM_STATUS_DOT_CLASS_NAME[mode];
}
