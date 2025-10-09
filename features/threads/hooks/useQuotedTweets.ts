import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { Tweet } from "@/features/threads/types";

/**
 * Resolve X/Twitter status URLs (by idsKey) into quoted Tweet objects.
 * idsKey is a stable, comma-separated list of unique status IDs.
 */
export function useQuotedTweets(idsKey: string | null | undefined) {
  const [quotes, setQuotes] = useState<Tweet[]>([]);

  const getDynamicThreadData = useAction(api.socialapi.getDynamicThreadData);
  const getDynamicThreadDataRef = useRef(getDynamicThreadData);

  // Keep latest function without causing the data effect to re-run
  useEffect(() => {
    getDynamicThreadDataRef.current = getDynamicThreadData;
  }, [getDynamicThreadData]);

  const ids = useMemo(
    () => (idsKey ? idsKey.split(",").filter(Boolean) : []),
    [idsKey]
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (ids.length === 0) {
        setQuotes([]);
        return;
      }

      const results: Tweet[] = [];
      await Promise.all(
        ids.map(async (id) => {
          try {
            const data = await getDynamicThreadDataRef.current({
              threadId: id,
            });
            const match: Tweet | undefined = (data?.tweets || []).find(
              (t: Tweet) => t.id_str === id
            );
            if (match) results.push(match);
          } catch {
            // ignore errors per-id
          }
        })
      );

      if (!cancelled) setQuotes(results);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  return quotes;
}
