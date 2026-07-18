import type { Doc } from "../_generated/dataModel";
import {
  extractLinkedInUsername,
  extractTwitterUsername,
} from "../../shared/lib/utils/url/socialProfiles";
import { getNestedRecord, getStringProperty } from "./typeGuards";

export type ProspectIdentitySource = Pick<
  Doc<"prospects">,
  "data" | "displayName" | "platform" | "prospectType" | "socialProfiles"
>;

export type ProspectIdentitySnapshot = {
  avatarUrl?: string;
  displayName?: string;
  linkedInUsername?: string;
  preferredLabel?: string;
  profileUrl?: string;
  screenName?: string;
  twitterUsername?: string;
  verified: boolean;
};

function cleanString(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

function firstString(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const cleaned = cleanString(value);
    if (cleaned) return cleaned;
  }
  return undefined;
}

function buildLinkedInProfileUrl(
  username: string,
  prospectType: Doc<"prospects">["prospectType"]
): string {
  return prospectType === "organization"
    ? `https://www.linkedin.com/company/${username}`
    : `https://www.linkedin.com/in/${username}`;
}

/** Extracts a provider-backed display name from raw prospect data. */
export function extractDisplayName(data: unknown): string | undefined {
  const user = getNestedRecord(data, "user");
  const author = getNestedRecord(data, "author");
  return firstString(
    getStringProperty(user, "name"),
    getStringProperty(author, "name"),
    getStringProperty(data, "name")
  );
}

/** Extracts a provider-backed avatar from raw prospect data. */
export function extractAvatarUrl(data: unknown): string | undefined {
  const user = getNestedRecord(data, "user");
  const author = getNestedRecord(data, "author");
  return firstString(
    getStringProperty(user, "profile_image_url_https"),
    getStringProperty(user, "profile_image_url"),
    getStringProperty(author, "profilePictureURL"),
    getStringProperty(author, "avatarUrl"),
    getStringProperty(data, "profileImage")
  );
}

/**
 * Resolves the canonical human-facing identity for a prospect.
 * Provider/internal IDs are intentionally not accepted as input, so they
 * cannot become labels by accident.
 */
export function getProspectIdentitySnapshot(
  prospect: ProspectIdentitySource | null
): ProspectIdentitySnapshot {
  if (!prospect) {
    return { verified: false };
  }

  const user = getNestedRecord(prospect.data, "user");
  const author = getNestedRecord(prospect.data, "author");
  const storedProfileUrl = firstString(
    prospect.socialProfiles?.twitter?.url,
    prospect.socialProfiles?.linkedin?.url
  );
  const rawLinkedInProfileUrl = firstString(
    getStringProperty(author, "profileUrl"),
    getStringProperty(author, "url")
  );

  const displayName = firstString(
    prospect.displayName,
    prospect.platform === "linkedin"
      ? getStringProperty(author, "name")
      : getStringProperty(user, "name"),
    extractDisplayName(prospect.data)
  );
  const twitterUsername = firstString(
    prospect.socialProfiles?.twitter?.username,
    getStringProperty(user, "screen_name"),
    getStringProperty(author, "handle"),
    extractTwitterUsername(storedProfileUrl ?? "")
  );
  const linkedInUsername = firstString(
    prospect.socialProfiles?.linkedin?.username,
    getStringProperty(author, "username"),
    getStringProperty(author, "handle"),
    extractLinkedInUsername(rawLinkedInProfileUrl ?? storedProfileUrl ?? "")
  );

  const profileUrl =
    prospect.platform === "twitter"
      ? firstString(
          prospect.socialProfiles?.twitter?.url,
          twitterUsername ? `https://x.com/${twitterUsername}` : undefined
        )
      : firstString(
          prospect.socialProfiles?.linkedin?.url,
          rawLinkedInProfileUrl,
          linkedInUsername
            ? buildLinkedInProfileUrl(linkedInUsername, prospect.prospectType)
            : undefined
        );
  const screenName =
    prospect.platform === "twitter" ? twitterUsername : linkedInUsername;
  const preferredLabel =
    displayName ??
    (prospect.platform === "twitter" && twitterUsername
      ? `@${twitterUsername}`
      : linkedInUsername);
  const verifiedType = cleanString(getStringProperty(user, "verified_type"));

  return {
    avatarUrl: extractAvatarUrl(prospect.data),
    displayName,
    linkedInUsername,
    preferredLabel,
    profileUrl,
    screenName,
    twitterUsername,
    verified:
      user?.verified === true ||
      (verifiedType !== undefined && verifiedType !== "none"),
  };
}

export function getProspectDisplayLabel(
  prospect: ProspectIdentitySource | null,
  fallback = "this prospect"
): string {
  return getProspectIdentitySnapshot(prospect).preferredLabel ?? fallback;
}
