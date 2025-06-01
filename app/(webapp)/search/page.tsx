// app/(webapp)/search/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SearchInput } from "@/features/search/ui/components/SearchInput";
import { SearchContent } from "@/features/search/ui/components/SearchContent";
import { useCallback, useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/shared/lib/utils/utils";
import type { KeywordItem } from "@/features/keywords/ui/components/KeywordList";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/shared/ui/components/Tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/components/DropdownMenu";
import { Button } from "@/shared/ui/components/Button";
import { FilterAltIcon, SwapVertIcon } from "@/shared/ui/components/icons";
import { MockTweetCard } from "@/features/search/ui/components/MockTweetCard";

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

// Mock tweet data structure matching your types
const mockTweets = [
  {
    id: "1",
    id_str: "1234567890",
    threadId: "thread_1",
    user: {
      id: 123,
      id_str: "123",
      name: "Customer",
      screen_name: "Customer",
      location: "San Francisco, CA",
      url: "https://reacherx.com",
      description: "Building the future of customer acquisition",
      protected: false,
      verified: false,
      followers_count: 1250,
      friends_count: 300,
      listed_count: 15,
      favourites_count: 2340,
      statuses_count: 450,
      created_at: "2020-01-15T10:30:00.000Z",
      profile_image_url_https: "",
      can_dm: true,
    },
    text: "@Vecterz Find #unlimited customers for your products/services with the help of advance search of ReacherX. https://reacherx.com",
    created_at: "2025-06-01T14:03:44.000Z",
    reply_count: 12,
    retweet_count: 45,
    quote_count: 8,
    favorite_count: 156,
    views_count: 2340,

    type: "post" as const,
  },
  {
    id: "2",
    id_str: "1234567891",
    threadId: "thread_2",
    user: {
      id: 124,
      id_str: "124",
      name: "Web Developer",
      screen_name: "webdev_pro",
      location: "Remote",
      description: "Full-stack developer sharing web dev tips and tricks",
      protected: false,
      verified: true,
      followers_count: 5420,
      friends_count: 890,
      listed_count: 45,
      favourites_count: 12300,
      statuses_count: 2340,
      created_at: "2019-05-20T14:22:00.000Z",
      profile_image_url_https: "",
      can_dm: true,
    },
    text: "Struggling with web development? Here are 5 tips that changed my career: 1. Master the fundamentals 2. Build projects 3. Join communities 4. Never stop learning 5. Share your knowledge",
    created_at: "2025-06-01T13:30:22.000Z",
    reply_count: 34,
    retweet_count: 123,
    quote_count: 15,
    favorite_count: 567,
    views_count: 4520,

    type: "post" as const,
  },
  {
    id: "3",
    id_str: "1234567892",
    threadId: "thread_1",
    user: {
      id: 125,
      id_str: "125",
      name: "Sarah Chen",
      screen_name: "sarahc_dev",
      location: "New York, NY",
      description: "Product designer who codes",
      protected: false,
      verified: false,
      followers_count: 890,
      friends_count: 456,
      listed_count: 12,
      favourites_count: 3450,
      statuses_count: 678,
      created_at: "2021-03-10T09:15:00.000Z",
      profile_image_url_https: "",
      can_dm: true,
    },
    text: "@Customer This looks amazing! I've been looking for something exactly like this. How does the pricing work?",
    created_at: "2025-06-01T13:45:15.000Z",
    reply_count: 5,
    retweet_count: 2,
    quote_count: 0,
    favorite_count: 23,
    views_count: 145,

    type: "reply" as const,
    in_reply_to_status_id_str: "1234567890",
  },
  {
    id: "4",
    id_str: "1234567893",
    threadId: "thread_3",
    user: {
      id: 126,
      id_str: "126",
      name: "Tech Startup",
      screen_name: "techstartup2025",
      location: "Austin, TX",
      description: "Early stage startup building the future",
      protected: false,
      verified: true,
      followers_count: 2340,
      friends_count: 567,
      listed_count: 23,
      favourites_count: 5670,
      statuses_count: 890,
      created_at: "2022-08-01T16:45:00.000Z",
      profile_image_url_https: "",
      can_dm: true,
    },
    text: "Quote tweet: This is exactly what we need for our customer acquisition! https://twitter.com/Customer/status/1234567890",
    created_at: "2025-06-01T12:20:33.000Z",
    reply_count: 8,
    retweet_count: 34,
    quote_count: 3,
    favorite_count: 89,
    views_count: 890,

    type: "quote" as const,
    quoted_status_id_str: "1234567890",
  },
];

type SortOption = "newest" | "oldest" | "most_liked" | "most_replied";
type FilterOption = "all" | "verified" | "media" | "links";

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Committed state (from URL - source of truth)
  const committedQuery = searchParams.get("q") || "";
  const committedExactMatch = searchParams.get("exact") === "true";

  // Draft state (being edited)
  const [draftQuery, setDraftQuery] = useState(committedQuery);
  const [draftExactMatch, setDraftExactMatch] = useState(committedExactMatch);

  // UI state
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [loading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tab and filter state
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");

  // Force re-render key for SearchInput when reverting
  const [inputKey, setInputKey] = useState(0);

  // Track if we're in the middle of a commit operation to prevent revert
  const isCommittingRef = useRef(false);

  // Sync draft state with committed state when URL changes
  useEffect(() => {
    setDraftQuery(committedQuery);
    setDraftExactMatch(committedExactMatch);
    setIsSearchMode(false);
    setInputKey((prev) => prev + 1); // Force SearchInput re-render
    isCommittingRef.current = false; // Reset commit flag
  }, [committedQuery, committedExactMatch]);

  // **CORE FIX**: Revert draft state whenever search mode exits without commit
  useEffect(() => {
    if (!isSearchMode && !isCommittingRef.current) {
      // Only revert if we're not in the middle of a commit operation
      if (
        draftQuery !== committedQuery ||
        draftExactMatch !== committedExactMatch
      ) {
        console.log("Auto-reverting to committed state:", {
          from: { query: draftQuery, exactMatch: draftExactMatch },
          to: { query: committedQuery, exactMatch: committedExactMatch },
        });

        setDraftQuery(committedQuery);
        setDraftExactMatch(committedExactMatch);
        setInputKey((prev) => prev + 1); // Force SearchInput re-render
      }
    }
  }, [
    isSearchMode,
    draftQuery,
    draftExactMatch,
    committedQuery,
    committedExactMatch,
  ]);

  // Get recent keywords (excluding current committed query)
  const recentKeywords = useMemo(
    () =>
      mockAllKeywords
        .filter(
          (item) => item.keyword.toLowerCase() !== committedQuery.toLowerCase()
        )
        .slice(0, 5),
    [committedQuery]
  );

  // Filter and sort tweets based on current selections
  const filteredAndSortedTweets = useMemo(() => {
    let tweets = [...mockTweets];

    // Filter by tab
    if (activeTab === "posts") {
      tweets = tweets.filter((tweet) => tweet.type === "post");
    } else if (activeTab === "replies") {
      tweets = tweets.filter((tweet) => tweet.type === "reply");
    } else if (activeTab === "quotes") {
      tweets = tweets.filter((tweet) => tweet.type === "quote");
    }

    // Apply additional filters
    if (filterBy === "verified") {
      tweets = tweets.filter((tweet) => tweet.user.verified);
    } else if (filterBy === "links") {
      tweets = tweets.filter((tweet) => tweet.text?.includes("http"));
    }

    // Sort tweets
    tweets.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "most_liked":
          return (b.favorite_count || 0) - (a.favorite_count || 0);
        case "most_replied":
          return (b.reply_count || 0) - (a.reply_count || 0);
        default:
          return 0;
      }
    });

    return tweets;
  }, [activeTab, sortBy, filterBy]);

  // Commit draft state (search execution)
  const handleSearch = useCallback(
    (searchQuery: string, isExactMatch: boolean) => {
      console.log("Search committed:", { searchQuery, isExactMatch });

      // Mark as committing to prevent auto-revert
      isCommittingRef.current = true;

      // Exit search mode
      setIsSearchMode(false);

      // Commit the state by navigating (updates URL)
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

  // Handle keyword selection from suggestions (also commits)
  const handleKeywordClick = useCallback(
    (item: KeywordItem) => {
      console.log("Keyword selected:", item);

      // Mark as committing to prevent auto-revert
      isCommittingRef.current = true;

      // Exit search mode
      setIsSearchMode(false);

      // Commit by navigating to search results
      const params = new URLSearchParams();
      params.set("q", item.keyword);

      router.push(`/search?${params.toString()}`);
    },
    [router]
  );

  // Update draft state (uncommitted changes)
  const handleQueryChange = useCallback((newQuery: string) => {
    setDraftQuery(newQuery);
  }, []);

  // Handle search input focus
  const handleSearchFocus = useCallback(() => {
    setIsSearchMode(true);
  }, []);

  // Handle search input blur with delay for click events
  const handleSearchBlur = useCallback(() => {
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

  // Manual revert function (for Escape key and other explicit revert actions)
  const revertToCommittedState = useCallback(() => {
    console.log("Manual revert to committed state:", {
      from: { query: draftQuery, exactMatch: draftExactMatch },
      to: { query: committedQuery, exactMatch: committedExactMatch },
    });

    setDraftQuery(committedQuery);
    setDraftExactMatch(committedExactMatch);
    setIsSearchMode(false);
    setInputKey((prev) => prev + 1); // Force SearchInput re-render

    // Remove focus from input
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  }, [committedQuery, committedExactMatch, draftQuery, draftExactMatch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSearchMode) {
        e.preventDefault();
        revertToCommittedState();
      }
    },
    [isSearchMode, revertToCommittedState]
  );

  // Add global keyboard event listener
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      ref={containerRef}
      className="max-w-lg pt-4 md:min-h-screen md:border-r md:border-border"
    >
      {/* Search header - now uses draft state */}
      <div className="mx-4">
        <SearchInput
          key={inputKey} // Force re-render when reverting
          ref={searchInputRef}
          defaultValue={draftQuery}
          defaultExactMatch={draftExactMatch}
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

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === "development" && (
        <div className="mx-4 mt-2 text-xs text-muted-foreground">
          <div>Committed: &quot;{committedQuery}&quot;</div>
          <div>Draft: &quot;{draftQuery}&quot;</div>
          <div>Mode: {isSearchMode ? "Search" : "Results"}</div>
          <div>Active Tab: {activeTab}</div>
          <div>Sort: {sortBy}</div>
          <div>Filter: {filterBy}</div>
        </div>
      )}

      {/* Conditional content area with smooth transitions */}
      <div className="mt-4">
        {isSearchMode ? (
          <SearchContent
            suggestions={mockSuggestions}
            recentKeywords={recentKeywords}
            allKeywords={mockAllKeywords}
            currentQuery={draftQuery} // Use draft query for suggestions
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
              "duration-200 animate-in fade-in-50 slide-in-from-bottom-2"
            )}
            role="main"
            aria-label="Search results"
          >
            {/* Tabs and Filters Header */}

            <div className="px-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between gap-1">
                  <TabsList size="sm">
                    <TabsTrigger size="sm" value="all">
                      All
                    </TabsTrigger>
                    <TabsTrigger size="sm" value="posts">
                      Posts
                    </TabsTrigger>
                    <TabsTrigger size="sm" value="replies">
                      Replies
                    </TabsTrigger>
                    <TabsTrigger size="sm" value="quotes">
                      Quotes
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex items-center gap-2">
                    {/* Filter Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="xs" className="gap-1">
                          <FilterAltIcon className="fill-current" />
                          Filter
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setFilterBy("all")}
                          className={filterBy === "all" ? "bg-accent" : ""}
                        >
                          All tweets
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setFilterBy("verified")}
                          className={filterBy === "verified" ? "bg-accent" : ""}
                        >
                          Verified accounts
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setFilterBy("media")}
                          className={filterBy === "media" ? "bg-accent" : ""}
                        >
                          With media
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setFilterBy("links")}
                          className={filterBy === "links" ? "bg-accent" : ""}
                        >
                          With links
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Sort Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="xsIcon">
                          <SwapVertIcon className="fill-current" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setSortBy("newest")}
                          className={sortBy === "newest" ? "bg-accent" : ""}
                        >
                          Newest first
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSortBy("oldest")}
                          className={sortBy === "oldest" ? "bg-accent" : ""}
                        >
                          Oldest first
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSortBy("most_liked")}
                          className={sortBy === "most_liked" ? "bg-accent" : ""}
                        >
                          Most liked
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSortBy("most_replied")}
                          className={
                            sortBy === "most_replied" ? "bg-accent" : ""
                          }
                        >
                          Most replied
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Results count */}
                <div className="mt-3 text-sm text-muted-foreground">
                  {filteredAndSortedTweets.length} results
                  {committedQuery && ` for "${committedQuery}"`}
                </div>
              </Tabs>
            </div>

            {/* Tweet Results */}
            <div className="divide-y divide-border">
              {filteredAndSortedTweets.length > 0 ? (
                filteredAndSortedTweets.map((tweet) => (
                  <div key={tweet.id} className="px-4 py-4">
                    <MockTweetCard tweet={tweet} />
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center">
                  <div className="mx-auto max-w-sm text-muted-foreground">
                    <p className="text-lg font-medium">No results found</p>
                    <p className="mt-2 text-sm">
                      Try adjusting your search terms or filters
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Load more placeholder */}
            {filteredAndSortedTweets.length > 0 && (
              <div className="border-t p-4">
                <Button variant="outline" className="w-full">
                  Load more results
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
