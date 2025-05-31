// features/keywords/ui/components/RecentKeywords.tsx
"use client";

import { memo } from "react";
import { KeywordList, type KeywordItem } from "./KeywordList";

interface RecentKeywordsProps {
  keywords: KeywordItem[];
  onKeywordClick?: (item: KeywordItem) => void;
  loading?: boolean;
  className?: string;
}

export const RecentKeywords = memo<RecentKeywordsProps>(
  function RecentKeywords({
    keywords,
    onKeywordClick,
    loading = false,
    className,
  }) {
    if (loading) {
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

    return (
      <section
        className={className}
        aria-label={`${keywords.length} recent keywords`}
        role="region"
      >
        <dl className="m-0">
          <dt className="mx-3.5 mb-2 text-xs font-medium text-muted-foreground">
            Recent ↴
          </dt>
          <dd className="m-0">
            <KeywordList
              items={keywords}
              onKeywordClick={onKeywordClick}
              showTimestamp={true}
              emptyMessage="No recent keywords"
              listLabel="Recent keywords, ordered by most recent"
            />
          </dd>
        </dl>
      </section>
    );
  }
);
