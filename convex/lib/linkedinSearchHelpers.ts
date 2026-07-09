// Centralized LinkdAPI search knobs so workflow allocation and transport
// pagination stay aligned as we tune LinkedIn discovery volume.

export const LINKEDIN_PEOPLE_DEFAULT_COUNT = 50;
export const LINKEDIN_PEOPLE_MAX_PAGES_PER_QUERY = 3;

export const LINKEDIN_POSTS_DEFAULT_PAGE_SIZE = 10;
export const LINKEDIN_POSTS_MAX_PAGES_PER_QUERY = 3;

function normalizePositiveInteger(value: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : fallback;
}

export function getNextLinkedInPeopleSearchStart(
  currentStart: number,
  count: number = LINKEDIN_PEOPLE_DEFAULT_COUNT
) {
  return (
    normalizePositiveInteger(currentStart, 0) +
    normalizePositiveInteger(count, LINKEDIN_PEOPLE_DEFAULT_COUNT)
  );
}

export function getNextLinkedInPostsSearchStart(
  currentStart: number,
  pageSize: number = LINKEDIN_POSTS_DEFAULT_PAGE_SIZE
) {
  return (
    normalizePositiveInteger(currentStart, 0) +
    normalizePositiveInteger(pageSize, LINKEDIN_POSTS_DEFAULT_PAGE_SIZE)
  );
}
