// features/keywords/ui/components/KeywordList.tsx
"use client";

import { memo, useMemo } from "react";
import { YoutubeSearchedForIcon } from "@/shared/ui/components/icons";
import { cn } from "@/shared/lib/utils/utils";

export interface KeywordItem {
  id: string;
  keyword: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

// Utility function for keyword similarity matching
export function getKeywordSimilarity(query: string, keyword: string): number {
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedKeyword = keyword.toLowerCase().trim();

  // Exact match
  if (normalizedKeyword === normalizedQuery) return 1.0;

  // Contains query
  if (normalizedKeyword.includes(normalizedQuery)) return 0.8;

  // Query contains keyword
  if (normalizedQuery.includes(normalizedKeyword)) return 0.7;

  // Word overlap scoring
  const queryWords = normalizedQuery.split(/\s+/);
  const keywordWords = normalizedKeyword.split(/\s+/);
  const commonWords = queryWords.filter((word) =>
    keywordWords.some((kw) => kw.includes(word) || word.includes(kw))
  );

  if (commonWords.length > 0) {
    return (
      (commonWords.length / Math.max(queryWords.length, keywordWords.length)) *
      0.6
    );
  }

  return 0;
}

export function filterSimilarKeywords(
  keywords: KeywordItem[],
  query: string,
  threshold: number = 0.3,
  maxResults: number = 10
): KeywordItem[] {
  if (!query.trim()) return [];

  return keywords
    .map((keyword) => ({
      ...keyword,
      similarity: getKeywordSimilarity(query, keyword.keyword),
    }))
    .filter((item) => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults)
    .map(({ similarity, ...item }) => item); // Remove similarity from final result
}

interface KeywordListProps {
  items: KeywordItem[];
  onKeywordClick?: (item: KeywordItem) => void;
  showTimestamp?: boolean;
  className?: string;
  emptyMessage?: string;
  itemClassName?: string;
  highlightQuery?: string; // For highlighting matched text
}

export const KeywordList = memo<KeywordListProps>(function KeywordList({
  items,
  onKeywordClick,
  showTimestamp = false,
  className,
  emptyMessage = "No keywords found",
  itemClassName,
  highlightQuery,
}) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "py-6 text-center text-sm text-muted-foreground",
          className
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)} role="list">
      {items.map((item) => (
        <KeywordListItem
          key={item.id}
          item={item}
          onClick={onKeywordClick}
          showTimestamp={showTimestamp}
          className={itemClassName}
          highlightQuery={highlightQuery}
        />
      ))}
    </div>
  );
});

interface KeywordListItemProps {
  item: KeywordItem;
  onClick?: (item: KeywordItem) => void;
  showTimestamp?: boolean;
  className?: string;
  highlightQuery?: string;
}

const KeywordListItem = memo<KeywordListItemProps>(function KeywordListItem({
  item,
  onClick,
  showTimestamp,
  className,
  highlightQuery,
}) {
  const handleClick = () => {
    onClick?.(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  // Highlight matching text
  const highlightedKeyword = useMemo(() => {
    if (!highlightQuery?.trim()) return item.keyword;

    const regex = new RegExp(
      `(${highlightQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = item.keyword.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, [item.keyword, highlightQuery]);

  return (
    <div
      role="listitem"
      tabIndex={onClick ? 0 : -1}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        onClick && [
          "cursor-pointer hover:bg-accent hover:text-accent-foreground",
          "focus:bg-accent focus:text-accent-foreground focus:outline-none",
        ],
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Keyword: ${item.keyword}${showTimestamp && item.timestamp ? `, ${item.timestamp}` : ""}`}
    >
      <YoutubeSearchedForIcon className="h-4 w-4 flex-shrink-0 fill-current opacity-70" />
      <span className="flex-1 truncate">{highlightedKeyword}</span>
      {showTimestamp && item.timestamp && (
        <span className="text-xs text-muted-foreground">{item.timestamp}</span>
      )}
    </div>
  );
});
