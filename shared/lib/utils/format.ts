import { differenceInDays, format, formatDistanceToNow } from "date-fns";

/**
 * Converts a date string into a "production-grade" format:
 * - If older than 7 days => "· Oct 4, 2022"
 * - Otherwise => "3 days ago", etc.
 */
export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return ""; // fallback if invalid date

  const now = new Date();
  const dayDiff = differenceInDays(now, date);

  // If older than 7 days, return "· Oct 4, 2022"
  if (dayDiff >= 7) {
    return `· ${format(date, "MMM d, yyyy")}`;
  }

  // Otherwise => relative time: "3 days ago", "2 hours ago", etc.
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Abbreviates large values to "1.2K", "3.4M", etc.
 * - If < 1,000 => returns the original number
 * - If >= 1,000 => abbreviates with K, M, B, T
 */
export function formatLargeNumber(value: number): string {
  if (value < 1000) return String(value);

  const suffixes = ["", "K", "M", "B", "T"];
  let suffixIndex = 0;
  let num = value;

  while (num >= 1000 && suffixIndex < suffixes.length - 1) {
    num /= 1000;
    suffixIndex++;
  }

  // Remove trailing .0 if any
  const formatted = num.toFixed(1).replace(/\.0$/, "");
  return `${formatted}${suffixes[suffixIndex]}`;
}
