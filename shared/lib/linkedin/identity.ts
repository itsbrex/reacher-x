import type { UnifiedAuthor, UnifiedPost } from "../platforms/types";
import type { LinkedInProfileIdentity } from "./profile";

export interface LinkedInTextAttribute {
  length?: number;
  text: string;
  type: "profileMention" | "companyMention";
  urn?: string;
  url?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function isCompanyType(type?: string): boolean {
  return type?.toUpperCase() === "COMPANY";
}

export function buildLinkedInAuthorIdentity(
  author: UnifiedAuthor
): LinkedInProfileIdentity | null {
  const profileUrl = getString(author.profileUrl);
  const providerId = getString(author.id);
  const displayName = getString(author.name);

  if (!profileUrl && !providerId && !displayName) {
    return null;
  }

  return {
    entityType:
      isCompanyType(author.type) ||
      /\/(company|school)\//i.test(profileUrl ?? "")
        ? "company"
        : "person",
    displayName,
    headline: getString(author.headline),
    avatarUrl: getString(author.avatarUrl),
    profileUrl,
    providerId,
    username: getString(author.handle),
  };
}

export function getLinkedInTextAttributes(
  post: UnifiedPost
): LinkedInTextAttribute[] {
  const raw = isRecord(post.raw) ? post.raw : null;
  const nestedPost = isRecord(raw?.post) ? raw.post : null;
  const values = Array.isArray(raw?.textAttributes)
    ? raw.textAttributes
    : Array.isArray(nestedPost?.textAttributes)
      ? nestedPost.textAttributes
      : [];

  return values.flatMap((value) => {
    if (!isRecord(value)) {
      return [];
    }

    const text = getString(value.text);
    const type = getString(value.type);
    if (!text || (type !== "profileMention" && type !== "companyMention")) {
      return [];
    }

    return [
      {
        length:
          typeof value.length === "number" && Number.isFinite(value.length)
            ? value.length
            : undefined,
        text,
        type,
        urn: getString(value.urn),
        url: getString(value.url),
      },
    ];
  });
}

export function buildLinkedInMentionIdentity(
  attribute: LinkedInTextAttribute
): LinkedInProfileIdentity {
  return {
    entityType: attribute.type === "companyMention" ? "company" : "person",
    displayName: attribute.text,
    profileUrl: attribute.url,
    providerId: attribute.urn,
  };
}
