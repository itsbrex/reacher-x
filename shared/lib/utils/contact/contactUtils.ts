export type ProspectContactSourceType =
  | "linkedin_contact_info"
  | "profile_bio"
  | "profile_post"
  | "website"
  | "website_contact_page";

export interface ProspectContactSource {
  sourceType: ProspectContactSourceType;
  sourceLabel: string;
  confidence: number;
  sourceUrl?: string;
  sourceSnippet?: string;
}

export interface DetectedEmailValue {
  value: string;
  normalizedValue: string;
  startIndex: number;
  endIndex: number;
}

export interface DetectedPhoneValue {
  value: string;
  normalizedValue: string;
  digits: string;
  startIndex: number;
  endIndex: number;
}

const EMAIL_REGEX =
  /(?:[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+)@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?\d[\d().\s-]{6,}\d(?:\s?(?:ext\.?|x)\s?\d{1,5})?)/gi;

export function normalizeEmailAddress(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizePhoneNumber(value: string): string | undefined {
  const trimmed = value
    .replace(/^tel:/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^\d+(]+/, "")
    .replace(/[^\d)]+$/, "");
  if (!trimmed) {
    return undefined;
  }

  const digits = getPhoneDigits(trimmed);
  if (digits.length < 7 || digits.length > 15) {
    return undefined;
  }

  return trimmed;
}

export function buildTelHref(value: string): string {
  const trimmed = value.trim();
  const plusPrefix = trimmed.startsWith("+") ? "+" : "";
  const digits = getPhoneDigits(trimmed);
  return `${plusPrefix}${digits}`;
}

export function extractEmailsFromText(text: string): DetectedEmailValue[] {
  const matches: DetectedEmailValue[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  EMAIL_REGEX.lastIndex = 0;
  while ((match = EMAIL_REGEX.exec(text)) !== null) {
    const normalizedValue = normalizeEmailAddress(match[0]);
    if (!normalizedValue || seen.has(normalizedValue)) {
      continue;
    }

    seen.add(normalizedValue);
    matches.push({
      value: match[0],
      normalizedValue,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return matches;
}

export function extractPhoneNumbersFromText(
  text: string
): DetectedPhoneValue[] {
  const matches: DetectedPhoneValue[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  PHONE_REGEX.lastIndex = 0;
  while ((match = PHONE_REGEX.exec(text)) !== null) {
    const normalizedValue = normalizePhoneNumber(match[0]);
    if (!normalizedValue) {
      continue;
    }

    const digits = getPhoneDigits(normalizedValue);
    if (seen.has(digits) || /^(\d)\1+$/.test(digits)) {
      continue;
    }

    seen.add(digits);
    matches.push({
      value: normalizedValue,
      normalizedValue,
      digits,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return matches;
}
