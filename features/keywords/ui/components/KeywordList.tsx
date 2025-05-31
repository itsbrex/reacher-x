// features/keywords/ui/components/KeywordList.tsx
"use client";

import { memo, useMemo, useCallback, useRef, useEffect } from "react";
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
    .map(({ similarity, ...item }) => item);
}

interface KeywordListProps {
  items: KeywordItem[];
  onKeywordClick?: (item: KeywordItem) => void;
  showTimestamp?: boolean;
  className?: string;
  emptyMessage?: string;
  itemClassName?: string;
  highlightQuery?: string;
  /** Accessible label for the keyword list */
  listLabel?: string;
  /** ID for the list container - useful for ARIA relationships */
  listId?: string;
  /** Current active item index for keyboard navigation */
  activeIndex?: number;
  /** Callback when active index changes */
  onActiveIndexChange?: (index: number) => void;
}

export const KeywordList = memo<KeywordListProps>(function KeywordList({
  items,
  onKeywordClick,
  showTimestamp = false,
  className,
  emptyMessage = "No keywords found",
  itemClassName,
  highlightQuery,
  listLabel = "Keyword suggestions",
  listId,
  activeIndex = -1,
  onActiveIndexChange,
}) {
  const listRef = useRef<HTMLUListElement>(null);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!onActiveIndexChange || items.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          const nextIndex =
            activeIndex < items.length - 1 ? activeIndex + 1 : 0;
          onActiveIndexChange(nextIndex);
          break;
        case "ArrowUp":
          e.preventDefault();
          const prevIndex =
            activeIndex > 0 ? activeIndex - 1 : items.length - 1;
          onActiveIndexChange(prevIndex);
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < items.length) {
            onKeywordClick?.(items[activeIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onActiveIndexChange(-1);
          break;
      }
    },
    [activeIndex, items, onActiveIndexChange, onKeywordClick]
  );

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeItem = listRef.current.children[activeIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [activeIndex]);

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "py-6 text-center text-sm text-muted-foreground",
          className
        )}
        role="status"
        aria-live="polite"
        id={listId}
      >
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={cn("space-y-1", className)}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label={listLabel}
    >
      <ul
        ref={listRef}
        className="space-y-1"
        role="listbox"
        aria-label={listLabel}
        id={listId}
        aria-activedescendant={
          activeIndex >= 0 ? `keyword-item-${items[activeIndex].id}` : undefined
        }
      >
        {items.map((item, index) => (
          <KeywordListItem
            key={item.id}
            item={item}
            onClick={onKeywordClick}
            showTimestamp={showTimestamp}
            className={itemClassName}
            highlightQuery={highlightQuery}
            isActive={index === activeIndex}
            index={index}
          />
        ))}
      </ul>
    </div>
  );
});

interface KeywordListItemProps {
  item: KeywordItem;
  onClick?: (item: KeywordItem) => void;
  showTimestamp?: boolean;
  className?: string;
  highlightQuery?: string;
  isActive?: boolean;
  index?: number;
}

const KeywordListItem = memo<KeywordListItemProps>(function KeywordListItem({
  item,
  onClick,
  showTimestamp,
  className,
  highlightQuery,
  isActive = false,
  index = 0,
}) {
  const itemRef = useRef<HTMLLIElement>(null);

  const handleClick = useCallback(() => {
    onClick?.(item);
  }, [onClick, item]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  // Accessible highlighted keyword with proper markup
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
          className="rounded bg-neutral-200 px-0.5 dark:bg-neutral-800 dark:text-secondary-foreground"
          aria-label={`highlighted text: ${part}`}
        >
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  }, [item.keyword, highlightQuery]);

  // Generate accessible description
  const accessibleDescription = useMemo(() => {
    let description = `Keyword: ${item.keyword}`;
    if (showTimestamp && item.timestamp) {
      description += `, searched ${item.timestamp}`;
    }
    if (isActive) {
      description += ", currently selected";
    }
    return description;
  }, [item.keyword, item.timestamp, showTimestamp, isActive]);

  return (
    <li
      ref={itemRef}
      role="option"
      aria-selected={isActive}
      aria-label={accessibleDescription}
      id={`keyword-item-${item.id}`}
      tabIndex={onClick ? 0 : -1}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        "focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1",
        onClick && [
          "cursor-pointer hover:bg-accent hover:text-accent-foreground",
          "focus-visible:bg-accent focus-visible:text-accent-foreground",
        ],
        isActive && "bg-accent text-accent-foreground",
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-index={index}
    >
      <YoutubeSearchedForIcon
        className="fill-current"
        aria-hidden="true"
        role="img"
        aria-label="Search keyword"
      />
      <span className="flex-1 truncate" aria-hidden="true">
        {highlightedKeyword}
      </span>
      {showTimestamp && item.timestamp && (
        <time
          className="text-right text-xs text-muted-foreground"
          dateTime={item.timestamp}
          aria-label={`searched ${item.timestamp}`}
        >
          · {item.timestamp}
        </time>
      )}
    </li>
  );
});
