import type { Doc, Id } from "@/convex/_generated/dataModel";
import { resolveProspectTwitterIdentity } from "@/shared/lib/twitter/prospectTwitterIdentity";
import { extractLinkedInUsername } from "@/shared/lib/utils/url/socialProfiles";

export type SetupPreviewProspectRecord = Doc<"prospects">;

export type SetupPreviewProfilePanelTarget =
  | {
      type: "twitter";
      prospectId: Id<"prospects">;
      username: string;
    }
  | {
      type: "linkedin";
      prospectId: Id<"prospects">;
    };

export type SetupPreviewProfileCardData = {
  variant: "twitter" | "linkedin";
  platform: "twitter" | "linkedin";
  profileData: Record<string, unknown>;
  label: string;
  context?: string;
  target?: SetupPreviewProfilePanelTarget;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function buildTwitterPreviewProfileData(
  preview: SetupPreviewProspectRecord
): SetupPreviewProfileCardData {
  const identity = resolveProspectTwitterIdentity(preview);

  return {
    variant: "twitter",
    platform: "twitter",
    label: "X profile",
    context: preview.matchReason,
    target: identity.username
      ? {
          type: "twitter",
          prospectId: preview._id,
          username: identity.username,
        }
      : undefined,
    profileData: {
      kind: "twitter",
      userId: identity.userId,
      username: identity.username,
      displayName: identity.displayName,
      bio: identity.bio,
      summary: preview.briefIntro,
      title: preview.title,
      avatarUrl: identity.avatarUrl,
      bannerUrl: identity.bannerUrl,
      profileUrl: identity.profileUrl,
      websiteUrl: identity.websiteUrl,
      location: identity.location,
      followersCount: identity.followersCount,
      followingCount: identity.followingCount,
      joinedAt: identity.joinedAt,
      verified: identity.verified,
      prospectType: preview.prospectType,
    },
  };
}

function buildLinkedInPreviewProfileData(
  preview: SetupPreviewProspectRecord
): SetupPreviewProfileCardData {
  const data = asRecord(preview.data);
  const author = asRecord(data?.author);
  const socialProfiles = asRecord(preview.socialProfiles);
  const linkedInProfile = asRecord(socialProfiles?.linkedin);
  const profileUrl =
    asString(linkedInProfile?.url) ??
    asString(author?.url) ??
    asString(data?.url);
  const username =
    asString(linkedInProfile?.username) ??
    asString(author?.username) ??
    extractLinkedInUsername(profileUrl ?? "");
  const displayName =
    preview.displayName ?? asString(author?.name) ?? username ?? "Unknown";
  const currentCompany = asRecord(author?.currentCompany);
  const currentCompanyName =
    asString(author?.currentCompanyName) ?? asString(currentCompany?.name);
  const currentCompanyLogo =
    asString(author?.currentCompanyLogo) ??
    asString(currentCompany?.logoUrl) ??
    asString(author?.companyLogo);
  const currentCompanyWebsite =
    asString(author?.currentCompanyWebsite) ??
    asString(currentCompany?.website) ??
    asString(preview.websiteUrl);

  return {
    variant: "linkedin",
    platform: "linkedin",
    label: "LinkedIn profile",
    context: preview.matchReason,
    target: {
      type: "linkedin",
      prospectId: preview._id,
    },
    profileData: {
      kind: "linkedin",
      username,
      displayName,
      firstName: asString(author?.firstName),
      headline: preview.title ?? asString(author?.headline),
      summary: preview.briefIntro ?? asString(author?.summary),
      profilePictureUrl:
        asString(author?.profilePictureURL) ?? asString(author?.avatarUrl),
      backgroundImageUrl:
        asString(author?.backgroundImageUrl) ??
        asString(author?.backgroundImageURL) ??
        asString(author?.bannerUrl),
      profileUrl,
      location: asString(author?.location),
      connectionCount: asNumber(author?.connectionCount),
      followerCount: asNumber(author?.followerCount),
      websiteUrl: currentCompanyWebsite,
      currentCompanyName,
      currentCompanyLogo,
      currentCompanyWebsite,
      prospectType: preview.prospectType,
    },
  };
}

export function buildSetupPreviewProfileData(
  preview: SetupPreviewProspectRecord
): SetupPreviewProfileCardData {
  if (preview.platform === "linkedin") {
    return buildLinkedInPreviewProfileData(preview);
  }

  return buildTwitterPreviewProfileData(preview);
}
