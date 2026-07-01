"use client";

import { useEffect, useMemo, useState } from "react";
import { useConvex } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

import type { ProspectListFilterArgs } from "../lib/prospectListFilters";

type HistogramQueryState = {
  data: { binCounts: number[] } | undefined;
  isError: boolean;
  scopeKey: string | null;
};

type UseProspectListFitScoreHistogramArgs = {
  open: boolean;
  workspaceId: Id<"workspaces"> | null;
  status: Doc<"prospectSummaries">["status"];
  platform: ProspectListFilterArgs["platform"];
  prospectType: ProspectListFilterArgs["prospectType"];
  createdAfterMs: number | undefined;
  createdBeforeMs: number | undefined;
};

export function useProspectListFitScoreHistogram(
  args: UseProspectListFitScoreHistogramArgs
) {
  const convex = useConvex();
  const [queryState, setQueryState] = useState<HistogramQueryState>({
    data: undefined,
    isError: false,
    scopeKey: null,
  });

  const histogramQueryArgs = useMemo(
    () =>
      args.open && args.workspaceId
        ? {
            workspaceId: args.workspaceId,
            status: args.status,
            platform: args.platform,
            prospectType: args.prospectType,
            createdAfterMs: args.createdAfterMs,
            createdBeforeMs: args.createdBeforeMs,
          }
        : null,
    [
      args.createdAfterMs,
      args.createdBeforeMs,
      args.open,
      args.platform,
      args.prospectType,
      args.status,
      args.workspaceId,
    ]
  );
  const histogramScopeKey = useMemo(
    () =>
      histogramQueryArgs
        ? JSON.stringify([
            histogramQueryArgs.workspaceId,
            histogramQueryArgs.status,
            histogramQueryArgs.platform ?? "all",
            histogramQueryArgs.prospectType ?? "both",
            histogramQueryArgs.createdAfterMs ?? "none",
            histogramQueryArgs.createdBeforeMs ?? "none",
          ])
        : null,
    [histogramQueryArgs]
  );

  useEffect(() => {
    let cancelled = false;

    if (!histogramQueryArgs || !histogramScopeKey) {
      return;
    }

    void convex
      .query(
        api.prospectSummaries.getWorkspaceFitScoreHistogram,
        histogramQueryArgs
      )
      .then((data) => {
        if (!cancelled) {
          setQueryState({
            data,
            isError: false,
            scopeKey: histogramScopeKey,
          });
        }
      })
      .catch((error) => {
        console.warn(
          "[useProspectListFitScoreHistogram] Failed to load fit score histogram",
          {
            workspaceId: String(histogramQueryArgs.workspaceId),
            status: histogramQueryArgs.status,
          },
          error
        );
        if (!cancelled) {
          setQueryState({
            data: undefined,
            isError: true,
            scopeKey: histogramScopeKey,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [convex, histogramQueryArgs, histogramScopeKey]);

  const activeQueryState =
    queryState.scopeKey === histogramScopeKey ? queryState : undefined;

  return {
    binCounts: activeQueryState?.data?.binCounts ?? Array(10).fill(0),
    isError: activeQueryState?.isError ?? false,
  };
}
