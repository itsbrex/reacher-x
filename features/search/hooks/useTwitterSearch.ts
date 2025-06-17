// features/search/hooks/useTwitterSearch.ts
"use client";

import { useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchHistory } from "./useSearchHistory";
import { Tweet } from "@/features/threads/types";

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export interface SearchResult {
  tweets: Tweet[];
  meta?: {
    originalCount?: number;
    filteredCount?: number;
    filterSummary?: string;
    has_next_page?: boolean;
    next_cursor?: string;
  };
}

export function useTwitterSearch() {
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const { addToHistory } = useSearchHistory();
  const searchTwitterAction = useAction(api.twitterSearch.searchTwitter);
  const filterTweetsAction = useAction(api.llmFilter.filterTweetsWithLLM);

  const searchTweets = useCallback(
    async (
      query: string,
      exactMatch: boolean,
      applyLLMFilter = false,
      cursor?: string
    ) => {
      if (!query.trim()) {
        setError("Please enter a search query");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Search Twitter with retry logic
        let searchResult;
        let attempts = 0;

        while (attempts < MAX_RETRIES) {
          try {
            searchResult = await searchTwitterAction({
              query: query.trim(),
              exactMatch,
              cursor,
            });
            break; // Success, exit retry loop
          } catch (err) {
            attempts++;
            if (attempts === MAX_RETRIES) {
              throw err; // Re-throw if we've exhausted retries
            }
            // Wait before retrying
            await new Promise((resolve) =>
              setTimeout(resolve, RETRY_DELAY * attempts)
            );
          }
        }

        if (!searchResult?.success) {
          throw new Error(searchResult?.error || "Search failed");
        }

        // Transform Twitter API response to our format
        const transformedResults: SearchResult = {
          tweets: searchResult.data?.tweets || [],
          meta: {
            has_next_page: searchResult.data?.has_next_page,
            next_cursor: searchResult.data?.next_cursor,
          },
        };

        // If we have existing results and this is a pagination request, append the new tweets
        if (cursor && results?.tweets) {
          setResults({
            tweets: [...results.tweets, ...transformedResults.tweets],
            meta: transformedResults.meta,
          });
        } else {
          setResults(transformedResults);
        }

        setRetryCount(0); // Reset retry count on success

        // Add to local search history only for initial search
        if (!cursor) {
          addToHistory(
            query.trim(),
            exactMatch,
            transformedResults.tweets.length
          );
        }

        // Apply LLM filtering if requested and API keys are configured
        if (
          applyLLMFilter &&
          Array.isArray(searchResult.data?.tweets) &&
          searchResult.data.tweets.length > 0
        ) {
          try {
            const filterResult = await filterTweetsAction({
              tweets: { tweets: searchResult.data?.tweets },
              originalQuery: query.trim(),
            });

            if (filterResult.success) {
              setResults({
                tweets: filterResult.data.tweets,
                meta: {
                  ...filterResult.data.meta,
                  has_next_page: transformedResults.meta?.has_next_page,
                  next_cursor: transformedResults.meta?.next_cursor,
                },
              });
            }
          } catch (filterError) {
            console.error("LLM filtering error:", filterError);
            // Continue with unfiltered results if filtering fails
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage);
        console.error("Search error:", err);

        // Update retry count
        setRetryCount((prev) => prev + 1);
      } finally {
        setLoading(false);
      }
    },
    [searchTwitterAction, filterTweetsAction, addToHistory, results]
  );

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
    setRetryCount(0);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  return {
    searchTweets,
    results,
    loading,
    error,
    retryCount,
    clearResults,
    clearError,
  };
}
