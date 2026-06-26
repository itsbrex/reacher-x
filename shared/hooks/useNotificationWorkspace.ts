"use client";

import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { useConvexReady } from "./useConvexReady";
import { usePreferredShellQueryArgs } from "./usePreferredShellQueryArgs";
import { useQueryWithStatus } from "./useQueryWithStatus";

/**
 * Resolves the workspace notifications should be scoped to for the current
 * shell context. Draft setup sessions without a target workspace intentionally
 * return null so they don't inherit another workspace's notifications.
 */
export function useNotificationWorkspace() {
  const {
    error: convexReadyError,
    isLoading: isConvexReadyLoading,
    isReady: isConvexReady,
  } = useConvexReady();
  const preferredShellQueryArgs = usePreferredShellQueryArgs();
  const shellStateQuery = useQueryWithStatus(
    api.shell.getAppShellState,
    isConvexReady ? preferredShellQueryArgs : "skip"
  );
  const shellState = shellStateQuery.data;

  const workspaceId = useMemo(() => {
    if (!shellState) {
      return null;
    }

    return shellState.notificationWorkspaceId ?? null;
  }, [shellState]);

  return {
    error: convexReadyError ?? shellStateQuery.error ?? null,
    isLoading:
      isConvexReadyLoading || (isConvexReady && shellStateQuery.isPending),
    isReady: isConvexReady,
    workspaceId,
    shellStateQuery,
  };
}
