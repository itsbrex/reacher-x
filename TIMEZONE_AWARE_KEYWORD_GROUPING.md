# Timezone-Aware Keyword Grouping System

## Overview

This document describes the robust, timezone-aware keyword grouping system that ensures consistent behavior across all user types (anonymous and signed-in) and timezone scenarios.

## Problems Solved

### 1. **Timezone Inconsistencies** ❌ → ✅

**Before**: Local client time used for grouping

```typescript
// PROBLEMATIC: Results vary by user timezone
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
```

**After**: UTC storage with timezone-aware grouping

```typescript
// ROBUST: Consistent UTC storage, timezone-aware display
const boundaries = calculateGroupingBoundaries(userTimezone);
```

### 2. **Mixed Timestamp Formats** ❌ → ✅

**Before**: Inconsistent handling of timestamps

- Unix timestamps (sometimes)
- ISO strings (timezone dependent)
- Relative strings ("2h", "3d") - cannot be grouped accurately

**After**: Standardized UTC timestamps with robust validation

```typescript
const validation = validateAndNormalizeTimestamp(timestamp);
// Handles all formats with proper validation and migration
```

### 3. **Cross-Device Inconsistency** ❌ → ✅

**Before**: Different grouping on different devices/sessions
**After**: Consistent grouping based on user's timezone, regardless of device

## Technical Implementation

### Core Architecture

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Time Utilities    │    │   Keyword Utils      │    │   Storage Layer     │
│                     │    │                      │    │                     │
│ • UTC timestamps    │◄──►│ • Timezone-aware     │◄──►│ • Consistent format │
│ • Timezone detection│    │   grouping           │    │ • Migration support │
│ • Validation        │    │ • Robust validation  │    │ • Error handling    │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

### Key Components

#### 1. **TimeUtils** (`shared/lib/utils/timeUtils.ts`)

**Purpose**: Centralized timezone-aware date/time operations
**References**:

- [MDN Date Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [W3C Timezone Standards](https://www.w3.org/International/core/2005/09/timezone)
- [JavaScript Temporal Proposal](https://tc39.es/proposal-temporal/docs/)

```typescript
interface TimezoneInfo {
  timezone: string;        // IANA identifier (e.g., 'America/New_York')
  offsetMinutes: number;   // UTC offset in minutes
  isDST: boolean;          // Daylight saving time status
}

interface GroupingBoundaries {
  todayStart: number;      // UTC timestamp for start of today
  yesterdayStart: number;  // UTC timestamp for start of yesterday
  lastWeekStart: number;   // UTC timestamp for start of last week
}
```

#### 2. **Enhanced Keyword Grouping** (`features/webapp/lib/keywordUtils.ts`)

**Purpose**: Timezone-aware keyword grouping with validation
**References**:

- [UTC Storage Pattern](https://www.w3.org/International/core/2005/09/timezone)
- [Date Edge Cases Handling](https://stackoverflow.com/questions/7556591/is-the-javascript-date-object-always-one-day-off)

```typescript
export function groupKeywordsByTime(
  keywords: KeywordItem[] | KeywordItemWithRawTimestamp[],
  timezoneInfo?: TimezoneInfo
): Record<string, KeywordItem[]>
```

#### 3. **Robust Storage Layer**

**Purpose**: Consistent UTC timestamp storage across all keyword sources

- Search History: Always stores UTC timestamps
- Pinned Keywords: Always stores UTC timestamps
- Keyword Performance: Always stores UTC timestamps

## User Type Compatibility

### ✅ Anonymous Users

- **Local Storage**: All timestamps stored as UTC
- **Timezone Detection**: Automatic via `Intl.DateTimeFormat`
- **Grouping**: Consistent across sessions and devices
- **Migration**: Legacy timestamps automatically migrated

### ✅ Signed-in Users

- **Future Ready**: System designed for server-side storage
- **Timezone Preferences**: Can be stored per user
- **Consistency**: Same grouping logic applies
- **Sync**: Ready for multi-device synchronization

## Validation & Testing

### Comprehensive Validation

```typescript
import { validateTimezoneAwareKeywordHistory } from '@/shared/lib/utils/validation';

const validation = validateTimezoneAwareKeywordHistory(
  historyItems,
  pinnedKeywords,
  groupedHistory,
  timezoneInfo
);

if (!validation.isValid) {
  console.error('Grouping issues:', validation.issues);
}
```

### Test Scenarios

#### 1. **Basic Functionality Test**

```typescript
// Add keywords at different times
addToHistory("cats", false);     // Now
addToHistory("dogs", false);     // Now
addToHistory("birds", false);    // Now

// All should appear in "Today" group
const grouped = groupKeywordsByTime(history);
assert(grouped.Today.length === 3);
```

#### 2. **Cross-Timezone Test**

```typescript
// Simulate different timezones
const estTimezone = { timezone: 'America/New_York', offsetMinutes: -300, isDST: false };
const pstTimezone = { timezone: 'America/Los_Angeles', offsetMinutes: -480, isDST: false };

const groupedEST = groupKeywordsByTime(keywords, estTimezone);
const groupedPST = groupKeywordsByTime(keywords, pstTimezone);

// Same UTC timestamps should group consistently based on timezone
```

#### 3. **Migration Test**

```typescript
// Legacy data with relative timestamps
const legacyHistory = [
  { keyword: "old", timestamp: "2h" },    // Should migrate to "Older"
  { keyword: "new", timestamp: Date.now() } // Should work normally
];

const grouped = groupKeywordsByTime(legacyHistory);
// System should handle gracefully with warnings
```

#### 4. **Edge Case Tests**

- **Midnight Boundary**: Keywords added just before/after midnight
- **DST Transition**: Keywords during daylight saving time changes
- **Invalid Data**: Malformed timestamps, null values
- **Future Dates**: Timestamps in the future
- **Extreme Dates**: Very old or very new timestamps

## Performance Considerations

### Optimizations

1. **Memoized Calculations**: Timezone info cached per session
2. **Efficient Validation**: Early returns for invalid data
3. **Batch Processing**: Multiple keywords processed together
4. **Smart Caching**: Grouping boundaries calculated once

### Memory Usage

- **UTC Storage**: More memory efficient than ISO strings
- **Minimal Overhead**: ~8 bytes per timestamp (vs 20+ for ISO strings)
- **Cleanup**: Automatic removal of expired cache entries

## Migration Strategy

### Automatic Migration

```typescript
// Legacy timestamps automatically converted
const migratedTimestamp = migrateLegacyTimestamp(
  oldTimestamp,     // Could be relative string, ISO string, etc.
  fallbackDate      // Current time if conversion fails
);
```

### Backward Compatibility

- Old relative timestamps: Gracefully handled, placed in "Older"
- ISO strings: Parsed and converted to UTC
- Invalid data: Fallback to current time with warnings

## Error Handling

### Graceful Degradation

```typescript
try {
  const grouped = groupKeywordsByTime(keywords, timezone);
  return grouped;
} catch (error) {
  console.warn('Grouping failed, using fallback:', error);
  return fallbackGrouping(keywords);
}
```

### Development Debugging

- Comprehensive logging in development mode
- Timezone grouping visualization
- Validation warnings for problematic data
- Performance metrics tracking

## References & Standards

### International Standards

- **ISO 8601**: Date and time format standard
- **IANA Time Zone Database**: Timezone identifiers
- **RFC 3339**: Internet timestamp format

### JavaScript APIs

- **Intl.DateTimeFormat**: Timezone detection and formatting
- **Date Object**: Core date/time operations
- **JSON Serialization**: Consistent data storage

### Best Practices

- [MDN Date Handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [W3C Internationalization](https://www.w3.org/International/)
- [Stack Overflow Timezone Best Practices](https://stackoverflow.com/questions/15141762/how-to-initialize-a-javascript-date-to-a-particular-timezone)

## Future Enhancements

### Server-Side Integration

- Store user timezone preferences
- Server-side grouping for performance
- Multi-device synchronization

### Advanced Features

- Custom time period definitions
- Timezone-aware analytics
- Historical timezone tracking

## Testing Instructions

### Quick Validation

1. **Search for keywords**: Add "cats", "dogs", "birds"
2. **Check grouping**: All should appear in "Today"
3. **Pin a keyword**: "cats" should move from history to pinned
4. **Verify separation**: "cats" only in pinned, others only in history
5. **Test timezone**: Change system timezone, verify grouping updates

### Development Testing

```typescript
// In browser console (development mode)
import { debugTimezoneGrouping } from '@/shared/lib/utils/timeUtils';

debugTimezoneGrouping([
  { keyword: "test1", timestamp: Date.now() },
  { keyword: "test2", timestamp: Date.now() - 86400000 }, // Yesterday
]);

// Should show timezone info and grouping details
```

This robust implementation ensures consistent keyword grouping behavior for all users, regardless of their timezone, device, or user type (anonymous vs signed-in).
