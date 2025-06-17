// app/(webapp)/page.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Separator } from "@/shared/ui/components/Separator";
import { SearchInput } from "@/features/search/ui/components/SearchInput";
import { KeywordSuggestions } from "@/features/keywords/ui/components/KeywordSuggestions";
import { RecentKeywords } from "@/features/keywords/ui/components/RecentKeywords";
import { SimilarKeywords } from "@/features/keywords/ui/components/SimilarKeywords";
import { useSearchHistory } from "@/features/search/hooks/useSearchHistory";
import type { KeywordItem } from "@/features/keywords/ui/components/KeywordList";

// Mock suggestions - you can replace with API call later
const mockSuggestions: KeywordItem[] = [
  { id: "1", keyword: "help me in web dev" },
  { id: "2", keyword: "can't do web dev" },
  { id: "3", keyword: "web dev sucks" },
  { id: "4", keyword: "need a web dev" },
  { id: "5", keyword: "suck at web dev" },
];

export default function WebAppPage() {
  const router = useRouter();
  const [currentQuery, setCurrentQuery] = useState("");
  const { history: historyKeywords, isLoaded } = useSearchHistory();

  const handleSearch = useCallback(
    (query: string, exactMatch: boolean) => {
      const params = new URLSearchParams();
      params.set("q", query);
      if (exactMatch) params.set("exact", "true");

      router.push(`/search?${params.toString()}`);
    },
    [router]
  );

  const handleKeywordClick = useCallback(
    (item: KeywordItem) => {
      const params = new URLSearchParams();
      params.set("q", item.keyword);

      router.push(`/search?${params.toString()}`);
    },
    [router]
  );

  const handleQueryChange = useCallback((query: string) => {
    setCurrentQuery(query);
  }, []);

  // Get recent keywords (limit to 5 for homepage)
  const recentKeywords = historyKeywords.slice(0, 5);

  return (
    <div className="mx-auto mt-12 max-w-lg px-4">
      <h1 className="mb-4 text-center text-2xl font-medium">
        Who will you{" "}
        <span className="text-muted-foreground line-through">sell</span> help?
      </h1>

      <SearchInput
        onSearch={handleSearch}
        onQueryChange={handleQueryChange}
        placeholder="Type keywords..."
        className="mb-4"
      />

      <div className="space-y-2">
        <KeywordSuggestions
          suggestions={mockSuggestions}
          onSuggestionClick={handleKeywordClick}
          loading={false}
        />

        <Separator />

        {/* Show similar keywords if user has typed something */}
        {currentQuery.trim() && (
          <>
            <SimilarKeywords
              allKeywords={historyKeywords}
              currentQuery={currentQuery}
              onKeywordClick={handleKeywordClick}
              loading={!isLoaded}
              maxResults={5}
              threshold={0.3}
            />
            <Separator />
          </>
        )}

        <RecentKeywords
          keywords={recentKeywords}
          onKeywordClick={handleKeywordClick}
          loading={!isLoaded}
        />
      </div>
    </div>
  );
}
