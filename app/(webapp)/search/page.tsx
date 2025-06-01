// app/(webapp)/search/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SearchInput } from "@/features/search/ui/components/SearchInput";
import { SearchContent } from "@/features/search/ui/components/SearchContent";
import { useCallback, useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/shared/lib/utils/utils";
import type { KeywordItem } from "@/features/keywords/ui/components/KeywordList";

// Mock data - in real app, these would come from your data layer
const mockSuggestions: KeywordItem[] = [
  { id: "1", keyword: "help me in web dev" },
  { id: "2", keyword: "can't do web dev" },
  { id: "3", keyword: "web dev sucks" },
  { id: "4", keyword: "need a web dev" },
  { id: "5", keyword: "suck at web dev" },
];

const mockAllKeywords: KeywordItem[] = [
  { id: "6", keyword: "need a web dev", timestamp: "Mar 22, 2025" },
  { id: "7", keyword: "suck at web dev", timestamp: "9h" },
  { id: "8", keyword: "web dev suck", timestamp: "Mar 22, 2025" },
  { id: "9", keyword: "web dev sucks", timestamp: "10h" },
  { id: "10", keyword: "mobile dev sucks", timestamp: "Mar 21, 2025" },
  { id: "11", keyword: "help with web development", timestamp: "Mar 20, 2025" },
  { id: "12", keyword: "web developer needed", timestamp: "Mar 19, 2025" },
  { id: "13", keyword: "frontend development help", timestamp: "Mar 18, 2025" },
  { id: "14", keyword: "struggling with web dev", timestamp: "Mar 17, 2025" },
  {
    id: "15",
    keyword: "web programming assistance",
    timestamp: "Mar 16, 2025",
  },
];

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const exactMatch = searchParams.get("exact") === "true";

  // Search mode state management
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [currentQuery, setCurrentQuery] = useState(query);
  const [loading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get recent keywords (excluding current query)
  const recentKeywords = useMemo(
    () =>
      mockAllKeywords
        .filter(
          (item) => item.keyword.toLowerCase() !== currentQuery.toLowerCase()
        )
        .slice(0, 5),
    [currentQuery]
  );

  // Handle search execution
  const handleSearch = useCallback(
    (searchQuery: string, isExactMatch: boolean) => {
      console.log("Search:", { searchQuery, isExactMatch });

      // Exit search mode
      setIsSearchMode(false);

      // Navigate to new search results
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      if (isExactMatch) {
        params.set("exact", "true");
      }

      router.push(`/search?${params.toString()}`);
    },
    [router]
  );

  // Handle keyword selection from suggestions
  const handleKeywordClick = useCallback(
    (item: KeywordItem) => {
      console.log("Keyword clicked:", item);

      // Exit search mode
      setIsSearchMode(false);

      // Navigate to search results with selected keyword
      const params = new URLSearchParams();
      params.set("q", item.keyword);

      router.push(`/search?${params.toString()}`);
    },
    [router]
  );

  // Handle query changes (real-time as user types)
  const handleQueryChange = useCallback((newQuery: string) => {
    setCurrentQuery(newQuery);
  }, []);

  // Handle search input focus
  const handleSearchFocus = useCallback(() => {
    setIsSearchMode(true);
  }, []);

  // Handle search input blur with delay for click events
  const handleSearchBlur = useCallback(() => {
    // Only exit search mode if user clicks outside the container
    setTimeout(() => {
      if (
        containerRef.current &&
        !containerRef.current.contains(document.activeElement)
      ) {
        setIsSearchMode(false);
      }
    }, 150);
  }, []);

  // Handle input start (when user begins typing)
  const handleInputStart = useCallback(() => {
    setIsSearchMode(true);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSearchMode) {
        setIsSearchMode(false);
        // Blur the input to remove focus
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    },
    [isSearchMode]
  );

  // Add global keyboard event listener
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Reset search mode when query changes from URL
  useEffect(() => {
    setCurrentQuery(query);
    setIsSearchMode(false);
  }, [query]);

  return (
    <div
      ref={containerRef}
      className="max-w-lg pt-4 md:min-h-screen md:border-r md:border-border"
    >
      {/* Search header - fully functional */}
      <div className="mx-4">
        <SearchInput
          defaultValue={query}
          defaultExactMatch={exactMatch}
          placeholder="Type keywords..."
          onSearch={handleSearch}
          onQueryChange={handleQueryChange}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          onInputStart={handleInputStart}
          showExactMatch={true}
          aria-expanded={isSearchMode}
        />
      </div>

      {/* Conditional content area with smooth transitions */}
      <div className="mt-4">
        {isSearchMode ? (
          <SearchContent
            suggestions={mockSuggestions}
            recentKeywords={recentKeywords}
            allKeywords={mockAllKeywords}
            currentQuery={currentQuery}
            onKeywordClick={handleKeywordClick}
            loading={loading}
            className={cn(
              "duration-200 animate-in fade-in-50 slide-in-from-top-2",
              "space-y-2"
            )}
          />
        ) : (
          <div
            className={cn(
              "duration-200 animate-in fade-in-50 slide-in-from-bottom-2",
              "space-y-4"
            )}
            role="main"
            aria-label="Search results"
          >
            {/* Search results content */}
            <div className="border-b p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <span className="text-sm font-medium">C</span>
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-medium">Customer</span>
                    <span className="text-sm text-muted-foreground">
                      @Customer
                    </span>
                    <span className="rounded bg-black px-2 py-0.5 text-xs text-white">
                      Load new
                    </span>
                  </div>
                  <div className="mb-2 text-sm text-muted-foreground">
                    Replying to <span className="text-primary">@Customer</span>
                  </div>
                  <p className="mb-3 text-sm">
                    @Vecterz Find{" "}
                    <span className="text-amber-600">#unlimited</span>{" "}
                    <span className="font-medium">customers</span> for your{" "}
                    <span className="font-medium">products/services</span> with
                    the help of advance search of ReacherX.
                  </p>
                  <a
                    href="https://reacherx.com"
                    className="text-sm text-primary hover:underline"
                  >
                    https://reacherx.com
                  </a>

                  {/* Placeholder images grid */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="aspect-video rounded bg-muted" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* More results placeholder */}
            <div className="mx-4 rounded-lg border bg-muted/50 p-4">
              <div className="text-center text-sm text-muted-foreground">
                {query
                  ? `Search results for "${query}"`
                  : "More search results would appear here..."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
