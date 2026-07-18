import type { UnifiedMedia, UnifiedPost } from "@/shared/lib/platforms/types";
import { parseIsoToTimestamp } from "@/shared/lib/utils/time/timeUtils";
import { resolveLinkedInPostReference } from "./comments";

type LooseRecord = Record<string, unknown>;

function isRecord(value: unknown): value is LooseRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function getTimestamp(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return typeof value === "string" ? (parseIsoToTimestamp(value) ?? 0) : 0;
}

function normalizeMedia(value: unknown): UnifiedMedia[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const media = value.flatMap((item): UnifiedMedia[] => {
    if (!isRecord(item)) {
      return [];
    }
    const url = getString(item.url);
    if (!url) {
      return [];
    }
    const rawType = getString(item.type);
    const type: UnifiedMedia["type"] =
      rawType === "image" || rawType === "video" ? rawType : "link";
    return [
      {
        type,
        url,
        width: getNumber(item.width),
        height: getNumber(item.height),
        posterUrl: getString(item.posterUrl),
        title: getString(item.title),
        description: getString(item.description),
      },
    ];
  });

  return media.length > 0 ? media : undefined;
}

export function isLinkedInPostLike(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const raw = isRecord(value.raw) ? value.raw : value;
  return Boolean(
    value.platform === "linkedin" ||
    getString(value.postID) ||
    getString(value.postURL) ||
    getString(value.urn)?.startsWith("urn:li:") ||
    getString(raw.postID) ||
    getString(raw.postURL) ||
    getString(raw.urn)?.startsWith("urn:li:") ||
    isRecord(raw.postedAt) ||
    isRecord(raw.engagements)
  );
}

export function normalizeLinkedInPost(
  value: unknown,
  options?: { fallbackId?: string; fallbackUrl?: string }
): UnifiedPost | null {
  if (!isRecord(value) || !isLinkedInPostLike(value)) {
    return null;
  }

  const raw = isRecord(value.raw) ? value.raw : value;
  const author = isRecord(value.author)
    ? value.author
    : isRecord(raw.author)
      ? raw.author
      : undefined;
  const postedAt = isRecord(raw.postedAt) ? raw.postedAt : undefined;
  const engagements = isRecord(raw.engagements) ? raw.engagements : undefined;
  const metrics = isRecord(value.metrics)
    ? value.metrics
    : isRecord(raw.metrics)
      ? raw.metrics
      : undefined;
  const reference = resolveLinkedInPostReference({
    explicitPostId: options?.fallbackId,
    postData: value,
  });
  const canonicalMedia = normalizeMedia(value.media);
  const providerMedia = normalizeMedia(raw.mediaContent);

  return {
    id: reference.resolvedPostId ?? options?.fallbackId ?? "",
    platform: "linkedin",
    url:
      getString(value.url) ??
      getString(raw.postURL) ??
      reference.permalink ??
      options?.fallbackUrl,
    author: {
      id:
        getString(author?.id) ??
        getString(author?.urn) ??
        getString(author?.providerId),
      handle: getString(author?.handle) ?? getString(author?.public_identifier),
      name: getString(author?.name) ?? "LinkedIn user",
      avatarUrl:
        getString(author?.avatarUrl) ??
        getString(author?.profilePictureURL) ??
        getString(author?.profile_picture_url),
      profileUrl:
        getString(author?.profileUrl) ??
        getString(author?.url) ??
        getString(author?.profile_url),
      headline: getString(author?.headline),
      type:
        getString(author?.type) ??
        (author?.is_company === true ? "COMPANY" : undefined),
    },
    text:
      getString(value.text) ??
      getString(raw.text) ??
      getString(raw.comment) ??
      "",
    createdAt:
      getTimestamp(value.createdAt) ||
      getTimestamp(postedAt?.timestamp) ||
      getTimestamp(raw.date) ||
      getTimestamp(raw.parsed_datetime),
    metrics: {
      reactions:
        getNumber(metrics?.reactions) ??
        getNumber(engagements?.totalReactions) ??
        getNumber(raw.reaction_counter),
      comments:
        getNumber(metrics?.comments) ??
        getNumber(engagements?.commentsCount) ??
        getNumber(raw.comment_counter),
      reposts:
        getNumber(metrics?.reposts) ??
        getNumber(engagements?.repostsCount) ??
        getNumber(raw.repost_counter),
    },
    media: canonicalMedia ?? providerMedia,
    raw,
  };
}
