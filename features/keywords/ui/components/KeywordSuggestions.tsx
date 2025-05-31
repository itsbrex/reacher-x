// features/keywords/ui/components/KeywordSuggestions.tsx
"use client";

import { memo } from "react";
import { KeywordList, type KeywordItem } from "./KeywordList";

interface KeywordSuggestionsProps {
  suggestions: KeywordItem[];
  onSuggestionClick?: (item: KeywordItem) => void;
  loading?: boolean;
  className?: string;
}

export const KeywordSuggestions = memo<KeywordSuggestionsProps>(
  function KeywordSuggestions({
    suggestions,
    onSuggestionClick,
    loading = false,
    className,
  }) {
    if (loading) {
      return (
        <div className={className}>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Try these →
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
          Try these →
        </h3>
        <KeywordList
          items={suggestions}
          onKeywordClick={onSuggestionClick}
          emptyMessage="No suggestions available"
        />
      </div>
    );
  }
);
