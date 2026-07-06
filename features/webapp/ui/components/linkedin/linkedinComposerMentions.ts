"use client";

import type { MentionEntitySearchResult } from "@/shared/lib/mentions/mentionEntities";
import {
  buildLinkedInCommentMentionEntity,
  buildPostMentionEntity,
} from "@/shared/lib/mentions/postMentions";
import type { LinkedInPostComment } from "@/shared/lib/linkedin/comments";
import type { UnifiedPost } from "@/shared/lib/platforms/types";

export function buildLinkedInCommentAuthorMentionEntity(
  comment: LinkedInPostComment
): MentionEntitySearchResult {
  return {
    id: `prospect:linkedin-comment-author:${comment.id}`,
    entityId: `linkedin-comment-author:${comment.id}`,
    kind: "prospect",
    label: comment.author.name,
    mentionText: comment.author.name,
    secondaryLabel: comment.author.headline ?? "LinkedIn participant",
    avatarUrl: comment.author.avatarUrl ?? null,
    verified: false,
  };
}

export function buildLinkedInPostMentionEntities(args: {
  post: UnifiedPost;
  resolvedPost?: UnifiedPost | null;
  extraPeople?: MentionEntitySearchResult[];
  comments?: LinkedInPostComment[];
}) {
  const sourcePost = args.resolvedPost ?? args.post;
  const sourcePostUrl =
    typeof sourcePost.url === "string" ? sourcePost.url : undefined;
  const entities: MentionEntitySearchResult[] = [...(args.extraPeople ?? [])];
  const postEntity = buildPostMentionEntity({
    post: sourcePost,
    platformHint: "linkedin",
  });

  if (postEntity) {
    entities.push(postEntity);
  }

  for (const comment of args.comments ?? []) {
    const entity = buildLinkedInCommentMentionEntity({
      comment,
      sourcePostUrl,
    });
    if (entity) {
      entities.push(entity);
    }
  }

  const dedupedEntities: MentionEntitySearchResult[] = [];
  const seenIds = new Set<string>();
  for (const entity of entities) {
    if (seenIds.has(entity.id)) {
      continue;
    }
    seenIds.add(entity.id);
    dedupedEntities.push(entity);
  }

  return dedupedEntities;
}
