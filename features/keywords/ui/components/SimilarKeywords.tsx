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
        <div className={className}>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Similar to "{currentQuery}" →
          </h3>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </div>
      );
    }

    if (similarKeywords.length === 0) {
      return null; // Don't show section if no similar keywords
    }

    return (
      <div className={className}>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Similar to "{currentQuery}" →
        </h3>
        <KeywordList
          items={similarKeywords}
          onKeywordClick={onKeywordClick}
          showTimestamp={true}
          highlightQuery={currentQuery}
          emptyMessage="No similar keywords found"
        />
      </div>
    );
  }
);
