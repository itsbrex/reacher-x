/**
 * Custom hook for managing Open Graph previews
 *
 * Provides debounced URL detection, caching, error handling, and loading states
 * for Open Graph preview cards in composer components.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchOpenGraph, OpenGraphData } from "../lib/utils/opengraph";
import {
  getFirstValidUrl,
  isLikelyToHaveOpenGraph,
  normalizeUrl,
} from "../lib/utils/urlDetection";

export interface UseOpenGraphPreviewOptions {
  debounceMs?: number;
  enableCache?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

export interface UseOpenGraphPreviewResult {
  data: OpenGraphData | null;
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  clearError: () => void;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for managing Open Graph previews with debouncing and caching
 */
export function useOpenGraphPreview(
  text: string,
  options: UseOpenGraphPreviewOptions = {}
): UseOpenGraphPreviewResult {
  const {
    debounceMs = 500,
    enableCache = true,
    retryOnError = true,
    maxRetries = 2,
  } = options;

  const [data, setData] = useState<OpenGraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const retryCountRef = useRef(0);
  const lastUrlRef = useRef<string | null>(null);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refetch function
  const refetch = useCallback(async () => {
    if (!lastUrlRef.current) return;

    setError(null);
    setLoading(true);
    setFromCache(false);

    try {
      const result = await fetchOpenGraph(lastUrlRef.current, {
        cache: enableCache,
        retries: retryOnError ? maxRetries : 0,
      });

      if (result.data) {
        setData(result.data);
        setFromCache(result.fromCache || false);
        retryCountRef.current = 0;
      } else {
        setData(null);
        setError(result.error || "Failed to fetch Open Graph data");
      }
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [enableCache, retryOnError, maxRetries]);

  // Main effect for URL detection and fetching
  useEffect(() => {
    // Clear previous debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Note: AbortController is handled within fetchOpenGraph function

    // Reset states
    setData(null);
    setError(null);
    setFromCache(false);

    // Extract URL from text
    const url = getFirstValidUrl(text);

    if (!url) {
      setLoading(false);
      lastUrlRef.current = null;
      return;
    }

    const normalizedUrl = normalizeUrl(url);

    // Check if URL is likely to have Open Graph data
    if (!isLikelyToHaveOpenGraph(normalizedUrl)) {
      setLoading(false);
      lastUrlRef.current = null;
      return;
    }

    // Debounce the fetch operation
    debounceRef.current = setTimeout(async () => {
      // Skip if URL hasn't changed
      if (lastUrlRef.current === normalizedUrl) {
        return;
      }

      lastUrlRef.current = normalizedUrl;
      setLoading(true);
      retryCountRef.current = 0;

      try {
        const result = await fetchOpenGraph(normalizedUrl, {
          cache: enableCache,
          retries: retryOnError ? maxRetries : 0,
        });

        if (result.data) {
          setData(result.data);
          setFromCache(result.fromCache || false);
          retryCountRef.current = 0;
        } else {
          setData(null);
          setError(result.error || "Failed to fetch Open Graph data");

          // Auto-retry on error if enabled
          if (retryOnError && retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            setTimeout(() => {
              if (lastUrlRef.current === normalizedUrl) {
                refetch();
              }
            }, 1000 * retryCountRef.current);
          }
        }
      } catch (err) {
        setData(null);
        setError(err instanceof Error ? err.message : "Unknown error occurred");

        // Auto-retry on error if enabled
        if (retryOnError && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          setTimeout(() => {
            if (lastUrlRef.current === normalizedUrl) {
              refetch();
            }
          }, 1000 * retryCountRef.current);
        }
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    // Cleanup function
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [text, debounceMs, enableCache, retryOnError, maxRetries, refetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    fromCache,
    clearError,
    refetch,
  };
}
