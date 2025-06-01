// features/search/ui/components/MockTweetCard.tsx
"use client";

import React from "react";
import Link from "next/link";
import { TweetMenu } from "@/features/threads/ui/components/TweetMenu";
import { TweetMedia } from "@/features/threads/ui/components/TweetMedia";
import { cn } from "@/shared/lib/utils/utils";
import {
  QuickPhrasesIcon,
  RepeatIcon,
  FavoriteIcon,
  InsertChartIcon,
  NewReleasesIcon,
} from "@/shared/ui/components/icons";
import { formatLargeNumber } from "@/shared/lib/utils/format";
import type { User, Media } from "@/features/threads/types";

interface MockTweet {
  id: string;
  id_str: string;
  threadId: string;
  user: User;
  text?: string | null;
  created_at: string;
  reply_count?: number;
  retweet_count?: number;
  quote_count?: number;
  favorite_count?: number;
  views_count?: number;
  entities?: {
    media?: Media[];
  };
  type: "post" | "reply" | "quote";
  in_reply_to_status_id_str?: string;
  quoted_status_id_str?: string;
}

interface MockTweetCardProps {
  tweet: MockTweet;
  className?: string;
}

export function MockTweetCard({ tweet, className }: MockTweetCardProps) {
  const tweetUrl = `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`;
  const profileUrl = `https://x.com/${tweet.user.screen_name}`;

  const formattedReplyCount = formatLargeNumber(tweet.reply_count ?? 0);
  const repeatSum = (tweet.quote_count ?? 0) + (tweet.retweet_count ?? 0);
  const formattedRepeatSum = formatLargeNumber(repeatSum);
  const formattedFavoriteCount = formatLargeNumber(tweet.favorite_count ?? 0);
  const formattedViewsCount = formatLargeNumber(tweet.views_count ?? 0);

  // Format timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "now";
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Process text with links, mentions, and hashtags
  const processText = (text: string) => {
    return text.split(" ").map((word, index) => {
      if (word.startsWith("@")) {
        return (
          <Link
            key={index}
            href={`https://x.com/${word.slice(1)}`}
            className="text-blue-500 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {word}{" "}
          </Link>
        );
      }
      if (word.startsWith("#")) {
        return (
          <span key={index} className="text-blue-500">
            {word}{" "}
          </span>
        );
      }
      if (word.startsWith("http")) {
        return (
          <Link
            key={index}
            href={word}
            className="text-blue-500 hover:underline"
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noopener noreferrer"
          >
            {word}{" "}
          </Link>
        );
      }
      return word + " ";
    });
  };

  return (
    <article
      className={cn("cursor-pointer", className)}
      onClick={() => window.open(tweetUrl, "_blank")}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <span className="text-sm font-medium">
            {tweet.user.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href={profileUrl}
                className="font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {tweet.user.name}
              </Link>
              {tweet.user.verified && (
                <NewReleasesIcon className="h-4 w-4 fill-blue-500" />
              )}
              <Link
                href={profileUrl}
                className="font-mono text-sm text-muted-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                @{tweet.user.screen_name}
              </Link>
              <span className="text-sm text-muted-foreground">·</span>
              <time className="text-sm text-muted-foreground">
                {formatTimestamp(tweet.created_at)}
              </time>
            </div>
            <TweetMenu tweetUrl={tweetUrl} profileUrl={profileUrl} />
          </div>

          {/* Reply indicator */}
          {tweet.type === "reply" && tweet.in_reply_to_status_id_str && (
            <div className="text-sm text-muted-foreground">
              Replying to{" "}
              <Link
                href={`https://x.com/status/${tweet.in_reply_to_status_id_str}`}
                className="text-blue-500 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                this tweet
              </Link>
            </div>
          )}

          {/* Tweet text */}
          {tweet.text && (
            <div className="text-sm leading-relaxed">
              {processText(tweet.text)}
            </div>
          )}

          {/* Media */}
          {tweet.entities?.media && tweet.entities.media.length > 0 && (
            <TweetMedia media={tweet.entities.media} />
          )}

          {/* Footer */}
          <footer className="flex items-center justify-between gap-6 text-xs">
            {tweet.reply_count !== undefined && (
              <Link
                href={tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-muted-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <QuickPhrasesIcon className="fill-current" />
                {formattedReplyCount}
              </Link>
            )}
            {tweet.retweet_count !== undefined && (
              <Link
                href={tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-muted-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <RepeatIcon className="fill-current" />
                {formattedRepeatSum}
              </Link>
            )}
            {tweet.favorite_count !== undefined && (
              <Link
                href={tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-muted-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <FavoriteIcon className="fill-current" />
                {formattedFavoriteCount}
              </Link>
            )}
            {tweet.views_count !== undefined && (
              <Link
                href={tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-muted-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <InsertChartIcon className="fill-current" />
                {formattedViewsCount}
              </Link>
            )}
          </footer>
        </div>
      </div>
    </article>
  );
}
