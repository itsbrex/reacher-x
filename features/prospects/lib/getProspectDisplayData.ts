import type { Doc } from "@/convex/_generated/dataModel";
import { getProspectIdentitySnapshot } from "@/convex/lib/prospectIdentityCore";
import {
  extractLinkedInUsername,
  extractTwitterUsername,
} from "@/shared/lib/utils/url/socialProfiles";

export interface ProspectDisplayData {
  avatarUrl?: string;
  displayName: string;
  profileUrl?: string;
  twitterUsername?: string;
  linkedinUsername?: string;
  verified: boolean;
  title?: string;
  prospectType?: Doc<"prospects">["prospectType"];
  /** Source platform for this prospect (for UI cues such as avatar badges). */
  platform: Doc<"prospects">["platform"];
  conversationPlaceholderLabel: string;
}

export type ProspectCardRecord = Doc<"prospects"> | Doc<"prospectSummaries">;

function resolveProspectPlatform(
  platform: ProspectDisplayData["platform"],
  profileUrl?: string,
  twitterUsername?: string,
  linkedinUsername?: string
): ProspectDisplayData["platform"] {
  if (platform) return platform;
  if (twitterUsername || extractTwitterUsername(profileUrl || "")) {
    return "twitter";
  }
  if (linkedinUsername || extractLinkedInUsername(profileUrl || "")) {
    return "linkedin";
  }
  return platform;
}

function isProspectSummaryRecord(
  prospect: ProspectCardRecord
): prospect is Doc<"prospectSummaries"> {
  return "prospectId" in prospect;
}

/**
 * Extract display-first prospect identity fields used across prospect surfaces.
 * This keeps avatar/name/verified/profile URL fallbacks consistent everywhere.
 */
export function getProspectDisplayData(
  prospect: ProspectCardRecord
): ProspectDisplayData {
  if (isProspectSummaryRecord(prospect)) {
    const platform = resolveProspectPlatform(
      prospect.platform,
      prospect.profileUrl,
      prospect.twitterUsername,
      prospect.linkedInUsername
    );
    return {
      avatarUrl: prospect.avatarUrl,
      displayName: prospect.displayName,
      profileUrl: prospect.profileUrl,
      twitterUsername: prospect.twitterUsername,
      linkedinUsername: prospect.linkedInUsername,
      verified: prospect.verified,
      title: prospect.title,
      prospectType: prospect.prospectType,
      platform,
      conversationPlaceholderLabel: prospect.conversationPlaceholderLabel,
    };
  }

  const identity = getProspectIdentitySnapshot(prospect);
  const displayName = identity.preferredLabel ?? "Unknown";
  const platform = prospect.platform;

  const conversationPlaceholderLabel =
    platform === "twitter" && identity.twitterUsername
      ? `@${identity.twitterUsername}`
      : identity.linkedInUsername || displayName;

  return {
    avatarUrl: identity.avatarUrl,
    displayName,
    profileUrl: identity.profileUrl,
    twitterUsername: identity.twitterUsername,
    linkedinUsername: identity.linkedInUsername,
    verified: identity.verified,
    title: prospect.title,
    prospectType: prospect.prospectType,
    platform,
    conversationPlaceholderLabel,
  };
}
