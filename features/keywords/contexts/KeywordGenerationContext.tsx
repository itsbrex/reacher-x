"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { logger } from "@/shared/lib/logger";
import type { Id } from "@/convex/_generated/dataModel";

type RunParams = {
  userDescription: string;
  workspaceId?: Id<"workspaces"> | null;
};

type KeywordGenerationResponse = {
  keywords: Array<{
    id: string;
    keyword: string;
    timestamp: string;
    metadata: Record<string, unknown>;
  }>;
  metadata: {
    requestId: string;
    generatedAt: number;
    processingTimeMs: number;
    modelUsed: string;
    usedFallback: boolean;
  };
};

type ContextValue = {
  runGeneration: (p: RunParams) => Promise<KeywordGenerationResponse>;
  isInFlight: (key: string) => boolean;
};

const KeywordGenerationContext = createContext<ContextValue | undefined>(
  undefined
);

function normalizeDescription(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 256);
}

function makeKey(
  workspaceId?: Id<"workspaces"> | null,
  userDescription?: string
) {
  return `${String(workspaceId || "local")}|${normalizeDescription(userDescription || "")}`;
}

export function KeywordGenerationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const generateKeywordsAction = useAction(
    api.keywordSuggestions.generateKeywords
  );
  const inFlightRef = useRef<Map<string, Promise<KeywordGenerationResponse>>>(
    new Map()
  );

  const runGeneration = useCallback(
    async ({ userDescription, workspaceId }: RunParams) => {
      const key = makeKey(workspaceId || undefined, userDescription);
      const existing = inFlightRef.current.get(key);
      if (existing) {
        logger.info("[KWGEN_CTX] Using in-flight promise", { key });
        return existing;
      }

      const p = (async () => {
        logger.info("[KWGEN_CTX] Starting coordinated generation", {
          key,
          descLen: userDescription.length,
        });
        const res = await generateKeywordsAction({
          userDescription,
          workspaceId: workspaceId || undefined,
        });
        if (!res?.success || !res?.data) {
          throw new Error(res?.error || "Failed to generate keywords");
        }
        return res.data as KeywordGenerationResponse;
      })();

      inFlightRef.current.set(key, p);
      try {
        const data = await p;
        return data;
      } finally {
        inFlightRef.current.delete(key);
        logger.info("[KWGEN_CTX] Cleared in-flight entry", { key });
      }
    },
    [generateKeywordsAction]
  );

  const isInFlight = useCallback(
    (key: string) => inFlightRef.current.has(key),
    []
  );

  const value = useMemo<ContextValue>(
    () => ({ runGeneration, isInFlight }),
    [runGeneration, isInFlight]
  );
  return (
    <KeywordGenerationContext.Provider value={value}>
      {children}
    </KeywordGenerationContext.Provider>
  );
}

export function useKeywordGeneration() {
  const ctx = useContext(KeywordGenerationContext);
  if (!ctx)
    throw new Error(
      "useKeywordGeneration must be used within KeywordGenerationProvider"
    );
  return ctx;
}
