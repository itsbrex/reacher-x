# Keyword Suggestions Fix

## Issue Description

When users clicked on keyword suggestions, all the keyword suggestions were being added to the recent keywords and keyword history. This was incorrect behavior because:

1. **Keyword suggestions are meant to be previews/options** for users to choose from
2. **Only actual search execution should add keywords to history**
3. **Clicking a suggestion should not be equivalent to performing a search**

## Root Cause

The issue was in the `handleKeywordClick` functions in both:

- `app/(webapp)/page.tsx`
- `app/(webapp)/search/page.tsx`

These functions were calling `addOrUseKeyword()` when users clicked on keyword suggestions, which immediately added the keywords to the unified keyword store and made them appear in recent keywords.

## Solution

### 1. Fixed Keyword Suggestion Click Handlers

**Before:**

```typescript
const handleKeywordClick = useCallback(
  (item: KeywordItem) => {
    // Record usage in our unified store. Note that AI suggestions will have metadata.
    const keywordId = addOrUseKeyword(
      item.keyword,
      "ai_suggestion",
      item.metadata
    );
    recordKeywordUsage(item.id, item.keyword);

    const params = new URLSearchParams();
    params.set("q", item.keyword);
    params.set("keywordId", keywordId);

    router.push(`/search?${params.toString()}`);
  },
  [router, recordKeywordUsage]
);
```

**After:**

```typescript
const handleKeywordClick = useCallback(
  (item: KeywordItem) => {
    // Don't add to unified store yet - this is just a suggestion click
    // The keyword will be added to history when the user actually performs the search
    recordKeywordUsage(item.id, item.keyword);

    const params = new URLSearchParams();
    params.set("q", item.keyword);
    // Don't pass keywordId since we haven't created it yet

    router.push(`/search?${params.toString()}`);
  },
  [router, recordKeywordUsage]
);
```

### 2. Centralized Keyword Addition Logic

Moved the `addOrUseKeyword()` call to the search page's `useEffect` that handles URL changes. This ensures keywords are only added to the unified store when a search is actually performed:

```typescript
// In app/(webapp)/search/page.tsx useEffect
if (committedQuery && committedQuery.trim()) {
  console.log("[SEARCH_PAGE] Triggering search for:", {
    query: committedQuery,
    exactMatch: committedExactMatch,
    hasUserDescription: !!userDescription,
  });

  // Add keyword to unified store when search is performed
  // This handles both manual searches and keyword suggestion clicks
  addOrUseKeyword(committedQuery, "user_created");

  searchTweets(committedQuery, committedExactMatch);
  isInitialSearchDone.current = true;
}
```

### 3. Removed Duplicate Logic

Removed `addOrUseKeyword()` calls from the `handleSearch` functions since they're now handled centrally in the search page's `useEffect`.

## Benefits

1. **Correct Behavior**: Keywords are only added to history when searches are actually performed
2. **Single Source of Truth**: All keyword addition logic is centralized in one place
3. **Consistent Experience**: Whether users type keywords manually or click suggestions, the behavior is the same
4. **Better UX**: Keyword suggestions remain as suggestions until the user commits to a search

## Testing

To verify the fix:

1. Generate keyword suggestions
2. Click on a suggestion - it should navigate to search but NOT appear in recent keywords
3. Perform the search (press Enter or click search button) - the keyword should now appear in recent keywords
4. Repeat with different suggestions to ensure they don't all get added to history

## Files Modified

- `app/(webapp)/page.tsx` - Fixed `handleKeywordClick` and removed unused import
- `app/(webapp)/search/page.tsx` - Fixed `handleKeywordClick` and centralized keyword addition logic
