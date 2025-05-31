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
        <div className={className}>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Recent →
          </h3>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={className}>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Recent →
        </h3>
        <KeywordList
          items={keywords}
          onKeywordClick={onKeywordClick}
          showTimestamp={true}
          emptyMessage="No recent keywords"
        />
      </div>
    );
  }
);
