// shared/lib/utils/queryLimit.ts
// Centralized query length limit utilities for X/Twitter recent search

export const QUERY_CHAR_LIMIT = 512;

/** Normalize query for counting: trim and collapse internal whitespace */
export function normalizeQuery(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/** Effective budget available for the keyword text given exact-match quotes */
export function getQueryBudget(exactMatch: boolean): number {
  return QUERY_CHAR_LIMIT - (exactMatch ? 2 : 0);
}

/** Compute effective total length we will send to the API */
export function computeEffectiveLength(
  input: string,
  exactMatch: boolean
): number {
  const normalized = normalizeQuery(input);
  return normalized.length + (exactMatch ? 2 : 0);
}
