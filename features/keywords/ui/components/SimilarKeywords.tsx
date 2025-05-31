// features/keywords/ui/components/SimilarKeywords.tsx
"use client";

import { memo } from "react";
import {
  KeywordList,
  type KeywordItem,
  filterSimilarKeywords,
} from "./KeywordList";

interface SimilarKeywordsProps {
  allKeywords: KeywordItem[];
  currentQuery: string;
  onKeywordClick?: (item: KeywordItem) => void;
  loading?: boolean;
  className?: string;
  maxResults?: number;
  threshold?: number;
}

export const SimilarKeywords = memo<SimilarKeywordsProps>(
  function SimilarKeywords({
    allKeywords,
    currentQuery,
    onKeywordClick,
    loading = false,
    className,
    maxResults = 5,
    threshold = 0.3,
  }) {
    const similarKeywords = filterSimilarKeywords(
      allKeywords,
      currentQuery,
      threshold,
      maxResults
    );

    if (loading) {
      return (
        <section
          className={className}
          aria-label={`Keywords similar to ${currentQuery}`}
          aria-busy="true"
          role="region"
        >
          <dl className="m-0">
            <dt className="mx-3.5 mb-2 text-xs font-medium text-muted-foreground">
              Similar to "{currentQuery}" ↴
            </dt>
            <dd className="m-0">
              <div
                className="space-y-2"
                role="status"
                aria-label={`Loading keywords similar to ${currentQuery}`}
              >
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-9 animate-pulse rounded-md bg-muted"
                    aria-hidden="true"
                  />
                ))}
                <span className="sr-only">
                  Loading keywords similar to {currentQuery}...
                </span>
              </div>
            </dd>
          </dl>
        </section>
      );
    }

    if (similarKeywords.length === 0) {
      return null;
    }

    return (
      <section
        className={className}
        aria-label={`${similarKeywords.length} keywords similar to ${currentQuery}`}
        role="region"
      >
        <dl className="m-0">
          <dt className="mx-3.5 mb-2 text-xs font-medium text-muted-foreground">
            Similar to "{currentQuery}" ↴
          </dt>
          <dd className="m-0">
            <KeywordList
              items={similarKeywords}
              onKeywordClick={onKeywordClick}
              showTimestamp={true}
              highlightQuery={currentQuery}
              emptyMessage="No similar keywords found"
              listLabel={`Keywords similar to ${currentQuery}`}
            />
          </dd>
        </dl>
      </section>
    );
  }
);
