// features/webapp/ui/components/linkedin/LinkedInBody.tsx
"use client";

import * as React from "react";
import type { UnifiedPost } from "@/shared/lib/platforms/types";
import { cn } from "@/shared/lib/utils";
import { parseLinkedInText } from "@/shared/lib/utils";
import {
  highlightInReactTreeMultiple,
  HIGHLIGHT_PRESETS,
} from "@/shared/lib/utils";
import type { LinkedInProfileIdentity } from "@/shared/lib/linkedin/profile";
import {
  buildLinkedInMentionIdentity,
  getLinkedInTextAttributes,
} from "@/shared/lib/linkedin/identity";

export interface LinkedInBodyProps {
  post: UnifiedPost;
  characterLimit?: number;
  showFullContent?: boolean;
  highlightQueries?: string[];
  className?: string;
  onOpenProfile?: (identity: LinkedInProfileIdentity) => void;
}

function getVisibleLinkedInText(
  text: string,
  opts?: { characterLimit?: number; showFullContent?: boolean }
): string {
  const limit = opts?.characterLimit ?? 300;
  const full = String(text || "");
  if (opts?.showFullContent || full.length <= limit) return full;
  return full.substring(0, limit) + "... Read more";
}

export const LinkedInBody: React.FC<LinkedInBodyProps> = ({
  post,
  characterLimit = 300,
  showFullContent = false,
  highlightQueries,
  className,
  onOpenProfile,
}) => {
  const visible = getVisibleLinkedInText(post?.text || "", {
    characterLimit,
    showFullContent,
  });

  const textAttributes = React.useMemo(
    () => getLinkedInTextAttributes(post),
    [post]
  );
  const parsed = parseLinkedInText(visible, {
    attributes: textAttributes,
    onMentionClick: onOpenProfile
      ? (attribute) => onOpenProfile(buildLinkedInMentionIdentity(attribute))
      : undefined,
  });
  const content =
    Array.isArray(highlightQueries) && highlightQueries.length > 0
      ? highlightInReactTreeMultiple(parsed, highlightQueries, {
          ...HIGHLIGHT_PRESETS.KEYWORD,
        })
      : parsed;

  return (
    <div
      className={cn(
        "word-break [&_a]:text-muted-foreground [&_button]:text-muted-foreground text-sm hyphens-auto whitespace-pre-line [&_a]:hover:underline dark:[&_a]:text-neutral-400 [&_button]:hover:underline dark:[&_button]:text-neutral-400",
        className
      )}
      lang="auto"
    >
      {content}
    </div>
  );
};
