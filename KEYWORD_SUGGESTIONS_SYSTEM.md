# Keyword Suggestions System - Complete Implementation

## Overview

This document describes the complete implementation of the keyword suggestions system that addresses the issue of keyword generation requests being made on every visit to the "/" route. The new system implements the exact requirements you specified.

## Problem Solved

**Previous Issue**: Keyword generation requests were being made on every visit/refresh to the "/" route because:

- The system didn't properly cache AI-generated suggestions
- Suggestions were only kept in local state and lost on page refresh
- No proper lifecycle management for keyword suggestions

**New Solution**: Implemented a comprehensive keyword suggestion management system that:

- Stores 15 generated keywords at a time
- Shows only 5 unused keywords to the user
- Replaces used keywords with new ones from the pool
- Triggers regeneration only when needed
- Uses re-prompt service when user has voting data

## System Architecture

### 1. Keyword Suggestions Store (`shared/lib/utils/keywordSuggestionsStore.ts`)

**Purpose**: Manages the lifecycle of AI-generated keyword suggestions

**Key Features**:

- **Persistent Storage**: Uses localStorage to persist suggestions across sessions
- **Batch Management**: Stores 15 keywords, shows 5 at a time
- **Usage Tracking**: Marks keywords as used when clicked
- **Regeneration Logic**: Determines when new keywords need to be generated
- **Description Change Detection**: Detects when user description changes

**Core Functions**:

```typescript
// Get unused suggestions (up to 5)
getUnusedSuggestions(): KeywordSuggestion[]

// Mark a suggestion as used
markSuggestionAsUsed(keyword: string): boolean

// Check if regeneration is needed
shouldRegenerateSuggestions(): boolean

// Store new suggestions
storeNewSuggestions(keywords, userDescription): boolean

// Check if user description changed
hasUserDescriptionChanged(userDescription: string): boolean
```

### 2. Updated Keyword Suggestions Hook (`features/keywords/hooks/useKeywordSuggestions.ts`)

**Purpose**: Provides React hook interface for the keyword suggestions system

**Key Features**:

- **Smart Loading**: Loads suggestions from store on mount
- **Automatic Regeneration**: Triggers regeneration when needed
- **Re-prompt Integration**: Uses re-prompt service when user has voting data
- **Performance Optimization**: Prevents unnecessary API calls

**Lifecycle Management**:

1. **On Mount**: Load existing suggestions from store
2. **On Description Change**: Clear old suggestions, generate new ones
3. **On Keyword Use**: Mark as used, show next available suggestion
4. **On Regeneration Needed**: Generate 15 new keywords using appropriate service

### 3. Backend Updates

**Keyword Generation Service** (`convex/keywordSuggestions.ts`):

- Now generates 15 keywords instead of 5
- Updated prompts to ensure variety across all 15 keywords

**Re-prompt Service** (`convex/keywordRePrompt.ts`):

- Now generates 15 keywords instead of 5
- Uses performance data to improve keyword quality

## How It Works

### Initial Setup (Onboarding)

1. User provides description at "/onboarding"
2. System generates 15 keywords using AI
3. Keywords are stored in `keywordSuggestionsStore`
4. Only 5 unused keywords are shown to user

### Daily Usage Flow

1. **Page Load**: System loads unused suggestions from store (no API call)
2. **Keyword Click**:
   - Keyword is marked as used in store
   - Next unused keyword is shown (if available)
   - No API call needed
3. **Regeneration Trigger**: When ≤2 unused keywords remain
   - Check if user has voting data
   - If yes: Use re-prompt service with performance data
   - If no: Use simple generation service
   - Generate 15 new keywords
   - Store them and show 5 unused ones

### Smart Regeneration Logic

```typescript
// Check if regeneration is needed
if (shouldRegenerateSuggestions()) {
  if (shouldUseRePrompt()) {
    // Use re-prompt service with voting data
    const flaggedKeywords = allKeywords.filter(kw => kw.votes.length > 0);
    result = await rePromptKeywordsAction({
      userDescription,
      flaggedKeywords: flaggedKeywords.slice(0, 10),
    });
  } else {
    // Use simple generation
    result = await generateKeywordsAction({
      userDescription,
    });
  }
}
```

## Benefits

### 1. **No More Unnecessary API Calls**

- Keywords are loaded from localStorage on page load
- No generation requests on every visit
- API calls only when regeneration is actually needed

### 2. **Better User Experience**

- Consistent keyword suggestions across sessions
- Smooth replacement of used keywords
- No loading delays on page refresh

### 3. **Intelligent Regeneration**

- Uses voting data to improve keyword quality
- Falls back to simple generation for new users
- Maintains keyword variety and relevance

### 4. **Performance Optimization**

- Reduces API costs significantly
- Faster page loads
- Better caching strategy

## Configuration

### Store Configuration

```typescript
const SUGGESTIONS_CONFIG = {
  TOTAL_GENERATED: 15, // Total keywords to generate at once
  DISPLAY_COUNT: 5,    // Number of keywords to show to user
  MIN_UNUSED_FOR_REGENERATION: 2, // Trigger regeneration when this many unused remain
} as const;
```

### Hook Configuration

```typescript
const HOOK_CONFIG = {
  AUTO_FETCH_ON_MOUNT: true,
  USE_PERFORMANCE_FALLBACK: true,
  MAX_FALLBACK_KEYWORDS: 5,
  MIN_DESCRIPTION_LENGTH: DESCRIPTION_CONSTRAINTS.MIN_LENGTH,
  REQUEST_DEDUPE_TIME_MS: 1000, // Prevent requests within 1 second of each other
} as const;
```

## Testing Scenarios

### 1. **Fresh User (No Voting Data)**

- Visit "/" → Generates 15 keywords using simple generation
- Click 5 keywords → Shows next 5 from pool
- Click 5 more → Shows next 5 from pool
- Click 3 more → Triggers regeneration (2 unused remain)
- New 15 keywords generated using simple generation

### 2. **Experienced User (With Voting Data)**

- Visit "/" → Loads existing suggestions from store
- Click keywords → Replaces with unused ones from pool
- When regeneration needed → Uses re-prompt service with voting data
- New 15 keywords generated using performance-based improvement

### 3. **Description Change**

- User updates description at "/onboarding"
- System detects description change
- Clears old suggestions
- Generates 15 new keywords based on new description

### 4. **Page Refresh**

- Refresh "/" page → Loads suggestions from store (no API call)
- All unused keywords still available
- No regeneration needed unless pool is depleted

## Files Modified

### New Files

- `shared/lib/utils/keywordSuggestionsStore.ts` - Core suggestion management

### Modified Files

- `features/keywords/hooks/useKeywordSuggestions.ts` - Complete rewrite
- `convex/keywordSuggestions.ts` - Updated to generate 15 keywords
- `convex/keywordRePrompt.ts` - Updated to generate 15 keywords

### Unchanged Files

- `app/(webapp)/page.tsx` - Already fixed in previous update
- `app/(webapp)/search/page.tsx` - Already fixed in previous update

## Migration Notes

The new system is backward compatible and will automatically:

1. Detect existing users and load their current suggestions
2. Generate new suggestions if none exist
3. Handle description changes gracefully
4. Maintain all existing functionality while fixing the API call issue

## Performance Impact

### Before

- 1 API call per page visit
- No caching of suggestions
- Inefficient regeneration logic

### After

- 0 API calls on page load (loads from store)
- 1 API call only when regeneration needed
- Smart caching with localStorage
- Intelligent regeneration based on user behavior

This represents a **massive reduction** in API calls and significantly improved user experience.
