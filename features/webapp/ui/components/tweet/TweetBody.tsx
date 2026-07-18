import * as React from "react";
// No direct Link usage here; and avoid circular hook import in SSR
import { cn } from "@/shared/lib/utils";
import { parseText } from "@/shared/lib/utils";
import { highlightInReactTreeMultiple } from "@/shared/lib/utils";
import { Tweet as TweetType } from "@/features/threads/types";
import { getVisibleTweetPlainText } from "@/shared/lib/utils";
import { useTwitterProfileNavigation } from "./useTwitterProfileNavigation";

export interface TweetBodyProps {
  tweet: TweetType;
  characterLimit?: number;
  showFullContent?: boolean;
  bodyLineClamp?: number;
  highlightQueries?: string[];
  className?: string;
  readOnly?: boolean;
}

export const TweetBody: React.FC<TweetBodyProps> = ({
  tweet,
  characterLimit = 280,
  showFullContent = false,
  bodyLineClamp,
  highlightQueries,
  className,
}) => {
  const visibleText = getVisibleTweetPlainText(tweet, {
    characterLimit,
    showFullContent,
  });

  // Parse and highlight keywords in the tweet body
  const { openProfile } = useTwitterProfileNavigation();
  const parsedBody = parseText(visibleText, tweet?.entities, {
    onMentionClick: (username) => void openProfile({ username }),
  });
  const highlightedBody =
    Array.isArray(highlightQueries) && highlightQueries.length > 0
      ? highlightInReactTreeMultiple(parsedBody, highlightQueries)
      : parsedBody;

  return (
    <>
      {/* Replying to */}
      {tweet?.in_reply_to_screen_name && (
        <p
          className={cn("text-muted-foreground text-sm font-medium", className)}
        >
          Replying to{" "}
          <button
            type="button"
            className="text-foreground font-mono hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              if (tweet?.in_reply_to_screen_name) {
                openProfile({ username: tweet.in_reply_to_screen_name });
              }
            }}
          >
            @{tweet?.in_reply_to_screen_name}
          </button>
        </p>
      )}

      {/* Body */}
      <p
        lang="auto"
        className={cn(
          "word-break [&_a]:text-muted-foreground text-sm hyphens-auto whitespace-pre-line [&_a]:hover:underline dark:[&_a]:text-neutral-400",
          bodyLineClamp
            ? "[display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical]"
            : undefined
        )}
        style={
          bodyLineClamp
            ? ({ WebkitLineClamp: bodyLineClamp } as React.CSSProperties)
            : undefined
        }
      >
        {highlightedBody}
      </p>
    </>
  );
};

TweetBody.displayName = "TweetBody";
