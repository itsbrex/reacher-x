// features/search/ui/components/SearchInput.tsx
"use client";

import { useState, useCallback, memo, useEffect } from "react";
import { Input } from "@/shared/ui/components/Input";
import { Button } from "@/shared/ui/components/Button";
import { SearchIcon } from "@/shared/ui/components/icons";
import { Switch } from "@/shared/ui/components/Switch";
import { Label } from "@/shared/ui/components/Label";
import { cn } from "@/shared/lib/utils/utils";

interface SearchInputProps {
  onSearch?: (query: string, exactMatch: boolean) => void;
  onQueryChange?: (query: string) => void; // Real-time query changes
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
      onQueryChange?.(value); // Notify parent of real-time changes
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

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="pr-20"
          aria-label="Search keywords"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {/* <RandomizeIcon className="h-4 w-4 fill-muted-foreground" /> */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleSearch}
            disabled={disabled || !query.trim()}
            className="h-6 w-6 p-0"
            aria-label="Search"
          >
            <SearchIcon className="h-4 w-4 fill-current" />
          </Button>
        </div>
      </div>

      {showExactMatch && (
        <div className="flex items-center space-x-2">
          <Switch
            id="exact-match"
            checked={exactMatch}
            onCheckedChange={setExactMatch}
            disabled={disabled}
          />
          <Label
            htmlFor="exact-match"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Exact phrase/word match
          </Label>
        </div>
      )}
    </div>
  );
});
