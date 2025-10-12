"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { makeKeywordGenProgressKey } from "@/shared/lib/utils/progressKey";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspaceProfile } from "@/shared/hooks/useWorkspaceProfile";

type Phase =
  | "queued"
  | "searching"
  | "chunking"
  | "filtering"
  | "finalizing"
  | "complete";

export interface KeywordGenProgressState {
  value: number; // 0-100
  phase?: Phase;
  isComplete: boolean;
}

/**
 * Subscribe to live keyword generation progress keyed by current workspace+description.
 * Smoothly animates toward server-reported values without exceeding them.
 */
export function useKeywordGenProgress(): KeywordGenProgressState {
  const { workspace } = useAuth();
  const { description } = useWorkspaceProfile();

  const key = useMemo(() => {
    if (!description || description.trim().length === 0) return null;
    const wsId = workspace?._id ?? null;
    return makeKeywordGenProgressKey(String(wsId || ""), description);
  }, [workspace?._id, description]);

  const row = useQuery(
    api.searchProgress.getActiveByKeyword,
    key ? { keywordKey: key } : "skip"
  ) as { value: number; phase: Phase; isComplete: boolean } | null | undefined;

  const target = Math.max(0, Math.min(100, row?.value ?? 0));
  const phase = row?.phase;
  const isComplete = !!row?.isComplete || target >= 100;

  // Smooth display value toward target (never exceed target)
  const [display, setDisplay] = useState<number>(0);
  const rafRef = useRef<number | null>(null);
  const lastTargetRef = useRef<number>(0);

  useEffect(() => {
    // Cancel any previous animation
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const start = performance.now();
    const startVal = display;
    const endVal = target;
    lastTargetRef.current = endVal;

    if (endVal <= startVal) {
      // Snap downwards (should rarely happen)
      setDisplay(endVal);
      return;
    }

    const durationMs = Math.min(900, Math.max(180, (endVal - startVal) * 25));

    const step = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.min(
        endVal,
        Math.round(startVal + (endVal - startVal) * eased)
      );
      setDisplay(next);
      if (t < 1 && lastTargetRef.current === endVal) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // On completion, animate last bit quickly to 100
  useEffect(() => {
    if (!isComplete) return;
    setDisplay((prev) => (prev >= 100 ? 100 : 100));
  }, [isComplete]);
  return { value: display, phase, isComplete };
}
