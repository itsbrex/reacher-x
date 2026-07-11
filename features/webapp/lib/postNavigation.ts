import type * as React from "react";
import type { Tweet } from "@/features/threads/types";
import type { UnifiedPost } from "@/shared/lib/platforms/types";
import { base64UrlEncodeUtf8 } from "@/shared/lib/utils";

const INTERACTIVE_POST_TARGET_SELECTOR =
  "a,button,input,textarea,select,[role=button],[role=link],video,media-chrome";

export function shouldIgnorePostCardClick(
  event: React.MouseEvent<HTMLElement>
): boolean {
  const target = event.target as HTMLElement | null;
  const interactiveTarget = target?.closest(INTERACTIVE_POST_TARGET_SELECTOR);
  const hasSelection =
    typeof window !== "undefined" && Boolean(window.getSelection()?.toString());

  return Boolean(
    (interactiveTarget && interactiveTarget !== event.currentTarget) ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    hasSelection ||
    event.detail > 1
  );
}

export function shouldIgnorePostCardKeyDown(
  event: React.KeyboardEvent<HTMLElement>
): boolean {
  const target = event.target as HTMLElement | null;
  const interactiveTarget = target?.closest(INTERACTIVE_POST_TARGET_SELECTOR);

  return Boolean(
    (interactiveTarget && interactiveTarget !== event.currentTarget) ||
    (event.key !== "Enter" && event.key !== " ")
  );
}

export function buildXPostHref(tweet: Tweet): string | null {
  const postId = tweet.id_str || tweet.id?.toString();
  if (!postId) {
    return null;
  }

  const params = new URLSearchParams();
  const conversationId = tweet.conversation_id_str || postId;
  if (conversationId !== postId) {
    params.set("cid", conversationId);
  }

  const query = params.toString();
  return `/post/x/${postId}${query ? `?${query}` : ""}`;
}

export function buildLinkedInPostHref(post: UnifiedPost): string | null {
  if (!post.id) {
    return null;
  }

  const params = new URLSearchParams();
  try {
    params.set("t", base64UrlEncodeUtf8(JSON.stringify(post)));
  } catch {
    // The detail page can still resolve a post when a serializable payload exists.
  }

  const query = params.toString();
  return `/post/linkedin/${String(post.id)}${query ? `?${query}` : ""}`;
}
