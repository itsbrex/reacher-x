// features/search/ui/components/SearchInput.tsx
"use client";

import { useState, useCallback, memo, useEffect } from "react";
import { Input } from "@/shared/ui/components/Input";
import { Button } from "@/shared/ui/components/Button";
import { MatchWordIcon, SearchIcon } from "@/shared/ui/components/icons";
import { Toggle } from "@/shared/ui/components/Toggle";
import { cn } from "@/shared/lib/utils/utils";

interface SearchInputProps {
  onSearch?: (query: string, exactMatch: boolean) => void;
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  defaultExactMatch?: boolean;
  disabled?: boolean;
  showExactMatch?: boolean;
}

export const SearchInput = memo<SearchInputProps>(function SearchInput({
  onSearch,
  onQueryChange,
  placeholder = "Type keywords...",
  className,
  defaultValue = "",
  defaultExactMatch = false,
  disabled = false,
  showExactMatch = true,
}) {
  const [query, setQuery] = useState(defaultValue);
  const [exactMatch, setExactMatch] = useState(defaultExactMatch);

  // Sync with default values when they change
  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    setExactMatch(defaultExactMatch);
  }, [defaultExactMatch]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      onQueryChange?.(value);
    },
    [onQueryChange]
  );

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      onSearch?.(query.trim(), exactMatch);
    }
  }, [query, exactMatch, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleToggleExactMatch = useCallback((pressed: boolean) => {
    setExactMatch(pressed);
  }, []);

  return (
    <div className={cn("relative", className)}>
      <Input
        size="sm"
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          // Adjust right padding based on whether exact match toggle is shown
          // Toggle (~48px) + Search button (24px) + gaps (8px) + padding (16px) = ~96px
          showExactMatch ? "pr-24" : "pr-12"
        )}
        aria-label="Search keywords"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {showExactMatch && (
          <Toggle
            size="xsIcon"
            pressed={exactMatch}
            onPressedChange={handleToggleExactMatch}
            disabled={disabled}
            aria-label={
              exactMatch
                ? "Disable exact phrase match"
                : "Enable exact phrase match"
            }
            title="Toggle exact phrase match"
          >
            <MatchWordIcon className="fill-current" />
          </Toggle>
        )}
        <Button
          type="button"
          size="xsIcon"
          variant="ghost"
          onClick={handleSearch}
          disabled={disabled || !query.trim()}
          aria-label="Search"
          title="Search"
        >
          <SearchIcon className="h-4 w-4 fill-current" />
        </Button>
      </div>
    </div>
  );
});
