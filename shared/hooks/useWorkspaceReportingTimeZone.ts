"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DEFAULT_REPORTING_TIME_ZONE,
  normalizeTimeZoneIdentifier,
} from "@/shared/lib/utils";

export function useWorkspaceReportingTimeZone(
  workspaceId: string | null | undefined,
  persistedTimeZone: string | null | undefined
) {
  const setWorkspaceReportingTimeZone = useMutation(
    api.workspaces.setWorkspaceReportingTimeZone
  );
  const [browserTimeZone, setBrowserTimeZone] = useState(
    DEFAULT_REPORTING_TIME_ZONE
  );

  useEffect(() => {
    try {
      setBrowserTimeZone(
        normalizeTimeZoneIdentifier(
          Intl.DateTimeFormat().resolvedOptions().timeZone
        )
      );
    } catch {
      setBrowserTimeZone(DEFAULT_REPORTING_TIME_ZONE);
    }
  }, []);

  useEffect(() => {
    if (!workspaceId || persistedTimeZone) {
      return;
    }

    void setWorkspaceReportingTimeZone({
      workspaceId: workspaceId as Id<"workspaces">,
      timeZone: browserTimeZone,
    }).catch((error) => {
      console.warn(
        "[useWorkspaceReportingTimeZone] Failed to persist reporting timezone",
        error
      );
    });
  }, [
    browserTimeZone,
    persistedTimeZone,
    setWorkspaceReportingTimeZone,
    workspaceId,
  ]);

  const reportingTimeZone = useMemo(
    () => normalizeTimeZoneIdentifier(persistedTimeZone ?? browserTimeZone),
    [browserTimeZone, persistedTimeZone]
  );

  return {
    reportingTimeZone,
  };
}
