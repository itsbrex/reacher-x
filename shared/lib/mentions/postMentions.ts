import {
  extractLinkedInCanonicalPostIdFromUrl,
  type LinkedInPostComment,
  resolveLinkedInPostReference,
} from "@/shared/lib/linkedin/comments";
import type { UnifiedPost } from "@/shared/lib/platforms/types";
import {
  buildTwitterPostUrl,
  summarizeTwitterPost,
} from "@/shared/lib/twitter/contracts";
import type {
  MentionEntitySearchResult,
  MentionPostPlatform,
} from "./mentionEntities";

type LooseRecord = Record<string, unknown>;

function isRecord(value: unknown): value is LooseRecord {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getPreviewLabel(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 72) {
    return normalized;
  }

  return `${normalized.slice(0, 71).trimEnd()}…`;
}

function buildPostLikeMentionEntity(args: {
  id: string;
  entityId: string;
  label: string;
  secondaryLabel: string;
  avatarUrl?: string | null;
  workspaceId?: string;
  prospectId?: string;
  postId?: string;
  postUrl?: string | null;
  postPlatform: MentionPostPlatform;
  referenceKind?: "Post" | "Reply" | "Comment";
}) {
  const referenceKind = args.referenceKind ?? "Post";

  return {
    id: args.id,
    entityId: args.entityId,
    kind: "post" as const,
    label: args.label,
    mentionText: `${referenceKind}: ${args.label}`,
    secondaryLabel: args.secondaryLabel,
    avatarUrl: args.avatarUrl ?? null,
    verified: false,
    referenceText: `${referenceKind}: ${args.label} (platform: ${args.postPlatform}; postId: ${args.postId ?? args.entityId}${args.postUrl ? `; url: ${args.postUrl}` : ""}${args.prospectId ? `; prospectId: ${args.prospectId}` : ""})`,
    workspaceId: args.workspaceId,
    prospectId: args.prospectId,
    postId: args.postId ?? args.entityId,
    postUrl: args.postUrl ?? null,
    postPlatform: args.postPlatform,
  };
}

function getLinkedInTextPreview(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const raw = isRecord(value.raw) ? value.raw : undefined;
  return (
    getString(value.textPreview) ??
    getString(value.text) ??
    getString(value.content) ??
    getString(raw?.textPreview) ??
    getString(raw?.text) ??
    getString(raw?.content)
  );
}

function getLinkedInAuthor(value: unknown) {
  if (!isRecord(value)) {
    return {
      name: undefined,
      headline: undefined,
      avatarUrl: undefined,
    };
  }

  const author = isRecord(value.author) ? value.author : undefined;
  const raw = isRecord(value.raw) ? value.raw : undefined;
  const rawAuthor = raw && isRecord(raw.author) ? raw.author : undefined;

  return {
    name:
      getString(author?.name) ??
      getString(author?.handle) ??
      getString(rawAuthor?.name) ??
      getString(rawAuthor?.username),
    headline: getString(author?.headline) ?? getString(rawAuthor?.headline),
    avatarUrl:
      getString(author?.avatarUrl) ??
      getString(rawAuthor?.avatarUrl) ??
      getString(rawAuthor?.profilePictureURL),
  };
}

function buildTwitterPostMentionEntity(args: {
  post: unknown;
  workspaceId?: string;
  prospectId?: string;
  referenceKind?: "Post" | "Reply";
  idPrefix?: string;
}): MentionEntitySearchResult | null {
  const summary = summarizeTwitterPost(args.post);
  if (!summary?.ref?.postId) {
    return null;
  }

  const postId = summary.ref.postId;
  const postUrl = summary.url || buildTwitterPostUrl(summary.ref);
  const authorHandle = getString(summary.author?.handle);
  const authorName = getString(summary.author?.name);
  const authorLabel = authorHandle
    ? `@${authorHandle.replace(/^@/, "")}`
    : authorName;
  const referenceKind = args.referenceKind ?? "Post";
  const secondaryKind = referenceKind === "Reply" ? "X reply" : "X post";
  const label = getPreviewLabel(
    summary.textPreview,
    authorLabel ? `${secondaryKind} by ${authorLabel}` : secondaryKind
  );
  const secondaryLabel = authorLabel
    ? `${secondaryKind} • ${authorLabel}`
    : secondaryKind;

  return buildPostLikeMentionEntity({
    id: `${args.idPrefix ?? "post:twitter"}:${postId}`,
    entityId: postId,
    label,
    secondaryLabel,
    avatarUrl: summary.author?.avatarUrl ?? null,
    workspaceId: args.workspaceId,
    prospectId: args.prospectId,
    postId,
    postUrl,
    postPlatform: "twitter",
    referenceKind,
  });
}

function buildLinkedInPostMentionEntity(args: {
  post: unknown;
  workspaceId?: string;
  prospectId?: string;
}): MentionEntitySearchResult | null {
  const record = isRecord(args.post) ? args.post : null;
  const raw = record && isRecord(record.raw) ? record.raw : undefined;
  const preview = getLinkedInTextPreview(record ?? raw);
  const explicitSocialId =
    getString(record?.socialId) ??
    getString(record?.social_id) ??
    getString(raw?.socialId) ??
    getString(raw?.social_id);
  const explicitPostId =
    getString(record?.postID) ??
    getString(record?.urn) ??
    getString(raw?.postID) ??
    getString(raw?.urn);
  const reference = resolveLinkedInPostReference({
    post: (record as UnifiedPost | null) ?? undefined,
    postData: args.post,
  });
  const postUrl = reference.permalink ?? getString(record?.url);
  const canonicalPostId = extractLinkedInCanonicalPostIdFromUrl(postUrl);
  const hasLikelyPostSignal = Boolean(
    preview ||
    canonicalPostId ||
    explicitSocialId ||
    explicitPostId ||
    getString(record?.postedAt) ||
    getString(raw?.postedAt)
  );
  if (!hasLikelyPostSignal) {
    return null;
  }

  const postId =
    reference.resolvedPostId ??
    canonicalPostId ??
    explicitSocialId ??
    explicitPostId ??
    undefined;

  if (!preview && !postUrl && !postId) {
    return null;
  }

  const author = getLinkedInAuthor(record ?? raw);
  const authorLabel = author.name;
  const label = getPreviewLabel(
    preview,
    authorLabel ? `LinkedIn post by ${authorLabel}` : "LinkedIn post"
  );
  const secondaryLabel = authorLabel
    ? `LinkedIn post • ${authorLabel}`
    : "LinkedIn post";
  const stableEntityId = postId ?? postUrl;
  if (!stableEntityId) {
    return null;
  }

  return buildPostLikeMentionEntity({
    id: `post:linkedin:${stableEntityId}`,
    entityId: stableEntityId,
    label,
    secondaryLabel,
    avatarUrl: author.avatarUrl ?? null,
    workspaceId: args.workspaceId,
    prospectId: args.prospectId,
    postId: postId ?? stableEntityId,
    postUrl,
    postPlatform: "linkedin",
  });
}

function buildLinkedInCommentPermalink(args: {
  comment: LinkedInPostComment;
  sourcePostUrl?: string;
}) {
  const directPermalink = getString(args.comment.permalink);
  if (directPermalink) {
    return directPermalink;
  }

  const sourcePostUrl = getString(args.sourcePostUrl);
  if (!sourcePostUrl) {
    return undefined;
  }

  const commentId = getString(args.comment.id);
  if (!commentId?.startsWith("urn:")) {
    return sourcePostUrl;
  }

  try {
    const url = new URL(sourcePostUrl);
    url.searchParams.set("commentUrn", commentId);
    return url.toString();
  } catch {
    return sourcePostUrl;
  }
}

export function buildTwitterReplyMentionEntity(args: {
  post: unknown;
  workspaceId?: string;
  prospectId?: string;
}): MentionEntitySearchResult | null {
  return buildTwitterPostMentionEntity({
    ...args,
    referenceKind: "Reply",
    idPrefix: "post:twitter-reply",
  });
}

export function buildLinkedInCommentMentionEntity(args: {
  comment: LinkedInPostComment;
  sourcePostUrl?: string;
  workspaceId?: string;
  prospectId?: string;
}): MentionEntitySearchResult | null {
  const commentId = getString(args.comment.id);
  if (!commentId) {
    return null;
  }

  const authorLabel = getString(args.comment.author.name);
  const referenceKind = args.comment.parentCommentId ? "Reply" : "Comment";
  const secondaryKind =
    referenceKind === "Reply" ? "LinkedIn reply" : "LinkedIn comment";
  const label = getPreviewLabel(
    getString(args.comment.text),
    authorLabel ? `${secondaryKind} by ${authorLabel}` : secondaryKind
  );

  return buildPostLikeMentionEntity({
    id: `post:linkedin-comment:${args.comment.postId}:${commentId}`,
    entityId: commentId,
    label,
    secondaryLabel: authorLabel
      ? `${secondaryKind} • ${authorLabel}`
      : secondaryKind,
    avatarUrl: args.comment.author.avatarUrl ?? null,
    workspaceId: args.workspaceId,
    prospectId: args.prospectId,
    postId: commentId,
    postUrl:
      buildLinkedInCommentPermalink(args) ?? getString(args.sourcePostUrl),
    postPlatform: "linkedin",
    referenceKind,
  });
}

export function buildPostMentionEntity(args: {
  post: unknown;
  platformHint?: MentionPostPlatform | null;
  workspaceId?: string;
  prospectId?: string;
}): MentionEntitySearchResult | null {
  if (args.platformHint !== "linkedin") {
    const twitterEntity = buildTwitterPostMentionEntity(args);
    if (twitterEntity) {
      return twitterEntity;
    }
  }

  if (args.platformHint === "twitter") {
    return null;
  }

  return buildLinkedInPostMentionEntity(args);
}
