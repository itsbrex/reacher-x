// features/search/hooks/useTwitterSearch.ts
"use client";

import { useState, useCallback, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchHistory } from "./useSearchHistory";
import { Tweet } from "@/features/threads/types";

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const REQUEST_DEBOUNCE_TIME = 500; // 500ms debounce to prevent duplicate requests

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

  // Use ref to access current results without causing dependency issues
  const resultsRef = useRef<SearchResult | null>(null);
  resultsRef.current = results;

  // Request deduplication and rate limiting
  const lastRequestRef = useRef<{
    query: string;
    exactMatch: boolean;
    cursor?: string;
    timestamp: number;
  } | null>(null);
  const pendingRequestRef = useRef<Promise<void> | null>(null);

  const { addToHistory } = useSearchHistory();
  const searchTwitterAction = useAction(api.twitterSearch.searchTwitter);
  const filterTweetsAction = useAction(api.llmFilter.filterTweetsWithLLM);

  // Stable search function with request deduplication
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

      // Request deduplication - prevent duplicate requests
      const now = Date.now();
      const currentRequest = {
        query: query.trim(),
        exactMatch,
        cursor,
        timestamp: now,
      };

      // Check if this is a duplicate request within the debounce time
      if (
        lastRequestRef.current &&
        lastRequestRef.current.query === currentRequest.query &&
        lastRequestRef.current.exactMatch === currentRequest.exactMatch &&
        lastRequestRef.current.cursor === currentRequest.cursor &&
        now - lastRequestRef.current.timestamp < REQUEST_DEBOUNCE_TIME
      ) {
        console.log("Skipping duplicate request");
        return;
      }

      // If there's already a pending request, wait for it to complete
      if (pendingRequestRef.current) {
        console.log("Waiting for pending request to complete");
        await pendingRequestRef.current;
        return;
      }

      lastRequestRef.current = currentRequest;

      const executeSearch = async () => {
        setLoading(true);
        setError(null);

        let attempts = 0;
        let lastError: unknown = null;

        while (attempts < MAX_RETRIES) {
          try {
            console.log(
              `Attempting search: "${query.trim()}" (attempt ${attempts + 1})`
            );

            const searchResult = await searchTwitterAction({
              query: query.trim(),
              exactMatch,
              cursor,
            });

            if (!searchResult?.success) {
              // If the error is a 4xx (except 429), do not retry
              if (
                searchResult.error &&
                /4\d\d/.test(searchResult.error) &&
                !/429/.test(searchResult.error)
              ) {
                throw new Error(searchResult.error);
              }
              // If 429, show rate limit message and don't retry excessively
              if (searchResult.error && /429/.test(searchResult.error)) {
                setError(
                  "Rate limit exceeded. Please wait a minute before trying again."
                );
                setLoading(false);
                return;
              }
              throw new Error(searchResult.error || "Search failed");
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
            if (cursor && resultsRef.current?.tweets) {
              setResults({
                tweets: [
                  ...resultsRef.current.tweets,
                  ...transformedResults.tweets,
                ],
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
            setLoading(false);
            return;
          } catch (err: unknown) {
            lastError = err;
            attempts++;
            console.error(`Search attempt ${attempts} failed:`, err);

            // Only retry on network errors or 5xx
            if (
              typeof err === "object" &&
              err !== null &&
              "message" in err &&
              typeof (err as { message: string }).message === "string" &&
              /4\d\d/.test((err as { message: string }).message) &&
              !/429/.test((err as { message: string }).message)
            ) {
              // Do not retry on 4xx except 429
              break;
            }
            if (attempts === MAX_RETRIES) {
              break;
            }
            await new Promise((resolve) =>
              setTimeout(resolve, RETRY_DELAY * attempts)
            );
          }
        }

        setError(
          typeof lastError === "object" &&
            lastError !== null &&
            "message" in lastError &&
            typeof (lastError as { message: string }).message === "string"
            ? (lastError as { message: string }).message
            : "An unexpected error occurred. Please try again later."
        );
        setRetryCount((prev) => prev + 1);
        setLoading(false);
      };

      // Store the pending request promise
      pendingRequestRef.current = executeSearch();

      try {
        await pendingRequestRef.current;
      } finally {
        pendingRequestRef.current = null;
      }
    },
    [] // Empty dependency array - this function is now stable
  );

  // Stable clear function
  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
    setRetryCount(0);
    lastRequestRef.current = null;
    pendingRequestRef.current = null;
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
