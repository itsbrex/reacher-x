// features/webapp/ui/components/linkedin/LinkedInPostCard.tsx
"use client";

import * as React from "react";
import type { UnifiedPost } from "@/shared/lib/platforms/types";
import { cn } from "@/shared/lib/utils";
import { LinkedInMediaGrid } from "./LinkedInMediaGrid";
import { LinkedInMenu } from "./LinkedInMenu";
import { LinkedInHeader } from "./LinkedInHeader";
import { LinkedInBody } from "./LinkedInBody";
import { LinkedInFooter } from "./LinkedInFooter";
import { QuoteLinkedInCard } from "./QuoteLinkedInCard";
import { OpenGraphPreview } from "@/features/composer/ui/components/OpenGraphPreview";
import {
  getFirstValidUrl,
  isLikelyToHaveOpenGraph,
  normalizeUrl,
} from "@/shared/lib/utils";
import {
  shouldIgnorePostCardClick,
  shouldIgnorePostCardKeyDown,
} from "@/features/webapp/lib/postNavigation";
import { buildLinkedInAuthorIdentity } from "@/shared/lib/linkedin/identity";
import { useLinkedInProfileNavigation } from "./useLinkedInProfileNavigation";
import { usePostNavigation } from "@/features/webapp/hooks/usePostNavigation";
import { getLinkedInResharedPost } from "@/shared/lib/linkedin/post";
import { LinkedInActivityAttribution } from "./LinkedInActivityAttribution";

export interface LinkedInPostCardProps {
  post: UnifiedPost;
  prospectId?: string;
  characterLimit?: number;
  showFullContent?: boolean;
  highlightQueries?: string[];
  quotedPost?: UnifiedPost;
  className?: string;
  onClick?: () => void;
  disableExternalNavigation?: boolean;
  readOnly?: boolean;
  showMenu?: boolean;
  showFooter?: boolean;
  interactiveCursor?: boolean;
  openBehavior?: "auto" | "none" | "route" | "panel" | "external";
  previewMode?: boolean;
  commentBehavior?: "open_thread" | "create_action_request" | "none";
  isCommentsOpen?: boolean;
  onToggleComments?: (post: UnifiedPost) => void;
  commentsState?: {
    loading?: boolean;
    error?: string | null;
  };
  commentThread?: React.ReactNode;
}

export const LinkedInPostCard: React.FC<LinkedInPostCardProps> = ({
  post,
  prospectId,
  characterLimit = 300,
  showFullContent = false,
  highlightQueries,
  quotedPost,
  className,
  onClick,
  disableExternalNavigation = false,
  readOnly = false,
  showMenu,
  showFooter = true,
  interactiveCursor,
  openBehavior = "auto",
  previewMode = false,
  commentBehavior = "open_thread",
  isCommentsOpen = false,
  onToggleComments,
  commentsState,
  commentThread,
}) => {
  const { hasPanelStack, openLinkedInPost } = usePostNavigation();
  const openLinkedInProfile = useLinkedInProfileNavigation();
  const [isHovered, setIsHovered] = React.useState(false);

  const autoQuotedPost = React.useMemo(
    () => getLinkedInResharedPost(post),
    [post]
  );

  const effectiveQuotedPost = quotedPost || autoQuotedPost;
  const authorIdentity = React.useMemo(
    () => buildLinkedInAuthorIdentity(post.author),
    [post.author]
  );
  const canOpenInternally = Boolean(post?.id);
  const resolvedOpenBehavior =
    openBehavior === "auto"
      ? hasPanelStack && canOpenInternally
        ? "panel"
        : canOpenInternally
          ? "route"
          : !disableExternalNavigation && post?.url
            ? "external"
            : "none"
      : openBehavior;
  const isInteractive = Boolean(
    interactiveCursor ??
    (typeof onClick === "function" || resolvedOpenBehavior !== "none")
  );

  const ogUrl: string | null = React.useMemo(() => {
    const rawText = post?.text || "";
    const candidate = getFirstValidUrl(rawText);
    if (!candidate) return null;
    const normalized = normalizeUrl(candidate);
    return isLikelyToHaveOpenGraph(normalized) ? normalized : null;
  }, [post]);

  const openResolvedPost = React.useCallback(() => {
    if (typeof onClick === "function") {
      onClick();
      return;
    }

    if (resolvedOpenBehavior === "panel" || resolvedOpenBehavior === "route") {
      openLinkedInPost(post, resolvedOpenBehavior, prospectId);
      return;
    }

    if (resolvedOpenBehavior === "external" && post?.url) {
      window.open(post.url, "_blank", "noopener,noreferrer");
    }
  }, [onClick, openLinkedInPost, post, prospectId, resolvedOpenBehavior]);

  const handleCardActivate = React.useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (shouldIgnorePostCardClick(e)) return;
      e.stopPropagation();
      openResolvedPost();
    },
    [openResolvedPost]
  );

  const handleCardKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!isInteractive || shouldIgnorePostCardKeyDown(e)) return;

      e.preventDefault();
      e.stopPropagation();
      openResolvedPost();
    },
    [isInteractive, openResolvedPost]
  );

  return (
    <article
      className={cn(
        "min-w-0",
        isInteractive ? "cursor-pointer" : "",
        className
      )}
      onClick={isInteractive ? handleCardActivate : undefined}
      aria-label={`LinkedIn post by ${post?.author?.name || "LinkedIn user"}`}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? handleCardKeyDown : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {post.activity ? (
        <LinkedInActivityAttribution activity={post.activity} />
      ) : null}

      {/* Left column handled inside header for consistent avatar spacing */}
      <LinkedInHeader
        post={post}
        disableProfileNavigation={!authorIdentity}
        profileIdentity={authorIdentity}
        onOpenProfile={(identity) => openLinkedInProfile(identity, prospectId)}
      >
        {(showMenu ?? !readOnly) ? <LinkedInMenu post={post} /> : null}
      </LinkedInHeader>

      {/* Right column: content */}
      <div className="mt-2">
        <LinkedInBody
          post={post}
          characterLimit={characterLimit}
          showFullContent={showFullContent}
          highlightQueries={highlightQueries}
          onOpenProfile={(identity) => openLinkedInProfile(identity)}
        />
        {/* Open Graph preview for external links (only when no media and no quote) */}
        {ogUrl &&
          !(post?.media && post.media.length > 0) &&
          !effectiveQuotedPost && (
            <div className="mt-2">
              <OpenGraphPreview
                url={ogUrl}
                context="timeline"
                debounceMs={300}
                enableCache
                retryOnError
              />
            </div>
          )}
        <LinkedInMediaGrid media={post.media} className="mt-2" />
        {effectiveQuotedPost && (
          <div className="mt-2">
            <QuoteLinkedInCard
              post={effectiveQuotedPost}
              characterLimit={characterLimit}
              showFullContent={showFullContent}
              highlightQueries={highlightQueries}
              prospectId={prospectId}
            />
          </div>
        )}
        {showFooter ? (
          <LinkedInFooter
            post={post}
            prospectId={prospectId}
            isHovered={isHovered}
            readOnly={readOnly}
            previewMode={previewMode}
            commentBehavior={commentBehavior}
            isCommentsOpen={isCommentsOpen}
            onToggleComments={onToggleComments}
            commentsState={commentsState}
          />
        ) : null}
        {isCommentsOpen ? commentThread : null}
      </div>
    </article>
  );
};
