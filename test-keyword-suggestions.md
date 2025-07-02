# Keyword Suggestions System - Test Plan

## Test Objective

Verify that the new keyword suggestions system works correctly and eliminates unnecessary API calls on page visits.

## Test Scenarios

### 1. **Fresh User Test**

**Steps:**

1. Clear browser localStorage
2. Visit "/" page
3. Complete onboarding with a description
4. Verify that 15 keywords are generated (check console logs)
5. Verify that only 5 keywords are shown to user
6. Click on 5 keywords one by one
7. Verify that new keywords appear as old ones are used
8. Click 5 more keywords
9. Click 3 more keywords
10. Verify that regeneration is triggered (check console logs)

**Expected Results:**

- Initial generation: 1 API call to generate 15 keywords
- Keyword usage: 0 API calls (keywords loaded from store)
- Regeneration: 1 API call when ≤2 unused keywords remain
- Total API calls: 2 (instead of 13+ in old system)

### 2. **Page Refresh Test**

**Steps:**

1. Complete scenario 1 above
2. Refresh the "/" page
3. Verify that suggestions load immediately (no API call)
4. Check console logs for "Loaded suggestions from store"

**Expected Results:**

- 0 API calls on page refresh
- Suggestions load instantly from localStorage
- No loading state or delays

### 3. **Experienced User Test (With Voting Data)**

**Steps:**

1. Complete scenario 1 above
2. Go to search page and vote on some tweets
3. Return to "/" page
4. Use remaining keywords until regeneration is needed
5. Verify that re-prompt service is used (check console logs)

**Expected Results:**

- Re-prompt service called instead of simple generation
- 15 new keywords generated with performance data
- Console shows "useRePrompt: true"

### 4. **Description Change Test**

**Steps:**

1. Complete scenario 1 above
2. Go to "/onboarding" and change the description
3. Return to "/" page
4. Verify that new keywords are generated

**Expected Results:**

- System detects description change
- Old suggestions are cleared
- 15 new keywords generated based on new description
- Console shows "User description changed, regenerating"

### 5. **API Call Reduction Verification**

**Steps:**

1. Clear browser localStorage
2. Visit "/" page 10 times in a row
3. Count API calls in Network tab

**Expected Results:**

- Only 1 API call for initial generation
- 0 API calls for subsequent visits
- Massive reduction in API usage

## Console Logs to Monitor

### Successful Implementation Logs:

```
[KEYWORD_SUGGESTIONS] Loaded suggestions from store: { count: 5, stats: {...} }
[KEYWORD_SUGGESTIONS] Marked suggestion as used: "keyword"
[KEYWORD_SUGGESTIONS] Regeneration needed, generating new keywords
[KEYWORD_SUGGESTIONS] User description changed, regenerating
[KEYWORD_SUGGESTIONS] Generation completed successfully: { useRePrompt: true/false }
```

### Error Logs to Watch For:

```
[KEYWORD_SUGGESTIONS] Failed to load suggestions from store
[KEYWORD_SUGGESTIONS] Generation failed
[KEYWORD_SUGGESTIONS] Auto-fetching suggestions on mount (should not appear on every visit)
```

## Performance Metrics

### Before Implementation:

- API calls per visit: 1
- Page load time: Slower (waiting for API)
- User experience: Loading delays

### After Implementation:

- API calls per visit: 0 (loads from store)
- API calls per session: 1-2 (only when needed)
- Page load time: Instant (no API wait)
- User experience: Smooth, no delays

## Success Criteria

✅ **No API calls on page refresh**
✅ **Keywords persist across sessions**
✅ **Smooth keyword replacement when used**
✅ **Intelligent regeneration based on voting data**
✅ **Description change detection and handling**
✅ **Massive reduction in API usage**

## Manual Testing Commands

```bash
# Check if server is running
curl -s http://localhost:3000 > /dev/null && echo "Server running" || echo "Server down"

# Monitor console logs in browser
# Open DevTools → Console → Filter by "[KEYWORD_SUGGESTIONS]"

# Monitor network requests
# Open DevTools → Network → Filter by "keywordSuggestions" or "keywordRePrompt"
```

## Expected File Structure

```
shared/lib/utils/keywordSuggestionsStore.ts ✅ (New)
features/keywords/hooks/useKeywordSuggestions.ts ✅ (Modified)
convex/keywordSuggestions.ts ✅ (Modified - generates 15 keywords)
convex/keywordRePrompt.ts ✅ (Modified - generates 15 keywords)
```

## Rollback Plan

If issues are found, the system can be rolled back by:

1. Reverting `useKeywordSuggestions.ts` to previous version
2. Removing `keywordSuggestionsStore.ts`
3. Reverting backend changes to generate 5 keywords again

However, the new system is designed to be backward compatible and should work seamlessly.
