"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useOptionalPanelStack } from "@/features/prospects/contexts/PanelStackContext";
import type { Tweet } from "@/features/threads/types";
import type { UnifiedPost } from "@/shared/lib/platforms/types";
import {
  buildLinkedInPostHref,
  buildXPostHref,
} from "@/features/webapp/lib/postNavigation";

export type PostNavigationBehavior = "panel" | "route";

export function usePostNavigation() {
  const router = useRouter();
  const panelStack = useOptionalPanelStack();

  const openPanel = React.useCallback(
    (
      type: "twitter-post" | "linkedin-post-thread",
      props: Record<string, unknown>
    ) => {
      if (!panelStack) {
        return false;
      }

      if (panelStack.currentPanel) {
        panelStack.pushPanel(type, props);
      } else {
        panelStack.openRootPanel(type, props);
      }
      return true;
    },
    [panelStack]
  );

  const openTwitterPost = React.useCallback(
    (tweet: Tweet, behavior: PostNavigationBehavior) => {
      const postId = tweet.id_str || tweet.id?.toString();
      if (!postId) {
        return;
      }

      if (
        behavior === "panel" &&
        openPanel("twitter-post", {
          tweetId: postId,
          initialTweet: tweet,
        })
      ) {
        return;
      }

      const href = buildXPostHref(tweet);
      if (href) {
        router.push(href, { scroll: false });
      }
    },
    [openPanel, router]
  );

  const openLinkedInPost = React.useCallback(
    (
      post: UnifiedPost,
      behavior: PostNavigationBehavior,
      prospectId?: string
    ) => {
      if (
        behavior === "panel" &&
        openPanel("linkedin-post-thread", { post, prospectId })
      ) {
        return;
      }

      const href = buildLinkedInPostHref(post);
      if (href) {
        router.push(href, { scroll: false });
        return;
      }

      if (post.url) {
        window.open(post.url, "_blank", "noopener,noreferrer");
      }
    },
    [openPanel, router]
  );

  return {
    hasPanelStack: Boolean(panelStack),
    openTwitterPost,
    openLinkedInPost,
  };
}
