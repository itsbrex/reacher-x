// features/keywords/ui/components/RecentKeywords.tsx
"use client";

import { memo, useMemo } from "react";
import { KeywordList, type KeywordItem } from "./KeywordList";
import { useSearchHistory } from "@/features/search/hooks/useSearchHistory";

interface RecentKeywordsProps {
  /** Current search query for highlighting */
  currentQuery?: string;
  onKeywordClick?: (item: KeywordItem) => void;
  className?: string;
  /** Maximum number of recent keywords to display */
  maxResults?: number;
}

export const RecentKeywords = memo<RecentKeywordsProps>(
  function RecentKeywords({
    currentQuery = "",
    onKeywordClick,
    className,
    maxResults = 5,
  }) {
    // Get search history
    const { history, isLoaded } = useSearchHistory();

    // Include current query; simply take most recent items
    const recentKeywords = useMemo(() => {
      return history.slice(0, maxResults);
    }, [history, maxResults]);

    // Only depend on real history readiness
    const isLoading = !isLoaded;
    if (isLoading) {
      return (
        <section
          className={className}
          aria-label="Recent keywords"
          aria-busy="true"
          role="region"
        >
          <dl className="m-0">
            <dt className="mx-3.5 mb-2 text-xs font-medium text-muted-foreground">
              Recent ↴
            </dt>
            <dd className="m-0">
              <div
                className="space-y-2"
                role="status"
                aria-label="Loading recent keywords"
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-9 animate-pulse rounded-md bg-muted"
                    aria-hidden="true"
                  />
                ))}
                <span className="sr-only">Loading recent keywords...</span>
              </div>
            </dd>
          </dl>
        </section>
      );
    }

    // Hide section entirely when loaded but no recent keywords
    if (!isLoading && recentKeywords.length === 0) {
      return null;
    }

    return (
      <section
        className={className}
        aria-label={`${recentKeywords.length} recent keywords`}
        role="region"
      >
        <dl className="m-0">
          <dt className="mx-3.5 mb-2 text-xs font-medium text-muted-foreground">
            Recent ↴
          </dt>
          <dd className="m-0">
            <KeywordList
              items={recentKeywords}
              onKeywordClick={onKeywordClick}
              showTimestamp={true}
              listLabel="Recent keywords, ordered by most recent"
              highlightQuery={currentQuery}
            />
          </dd>
        </dl>
      </section>
    );
  }
);
