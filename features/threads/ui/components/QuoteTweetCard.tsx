import * as React from "react";
import type { Tweet as TweetType } from "../../types";
import { cn } from "@/shared/lib/utils/utils";
import { formatRelativeTime } from "@/shared/lib/utils/format";
import { TweetHeader } from "../../../webapp/ui/components/TweetHeader";
import { TweetBody } from "../../../webapp/ui/components/TweetBody";
import { TweetMedia } from "./TweetMedia";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/ui/components/Avatar";
import { LinkWrapper } from "@/features/landing/ui/components/LinkWrapper";
import { TweetMenu } from "../../../webapp/ui/components/TweetMenu";

export interface QuoteTweetCardProps {
  tweet: TweetType;
  characterLimit?: number;
  showFullContent?: boolean;
  highlightQuery?: string;
  className?: string;
  loading?: boolean;
}

export const QuoteTweetCard: React.FC<QuoteTweetCardProps> = ({
  tweet,
  characterLimit = 280,
  showFullContent = false,
  highlightQuery,
  className,
  loading = false,
}) => {
  const media = tweet?.entities?.media;
  const tweetUrl = `https://x.com/${tweet?.user?.screen_name}/status/${tweet?.id_str}`;
  const profileUrl = `https://x.com/${tweet?.user?.screen_name}`;

  // Extract tweet source (e.g., Twitter for iPhone)
  let tweetSource: React.ReactNode = null;
  if (tweet?.source) {
    // tweet.source is HTML like: <a href="...">Twitter for iPhone</a>
    if (typeof window !== "undefined") {
      const parser = new window.DOMParser();
      const doc = parser.parseFromString(tweet.source, "text/html");
      const a = doc.querySelector("a");
      if (a) {
        tweetSource = (
          <span className="text-xs text-muted-foreground">
            via{" "}
            <a
              href={a.getAttribute("href") || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {a.textContent}
            </a>
          </span>
        );
      }
    }
  }

  if (loading) {
    return (
      <div
        className={cn(
          "group block w-full cursor-pointer rounded-xl border p-2 transition-colors",
          className
        )}
        aria-label="Loading quoted tweet"
      >
        <div className="flex flex-col">
          <header className="mb-1 flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-muted ring-1 ring-border" />
            <div className="flex flex-1 items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-4 w-24 rounded-md bg-muted" />
                <div className="h-4 w-16 rounded-md bg-muted" />
              </div>
              <div className="h-4 w-6 rounded-md bg-muted" />
            </div>
          </header>
          <div className="mb-1 space-y-2">
            <div className="h-4 w-5/6 rounded-md bg-muted" />
            <div className="h-4 w-4/6 rounded-md bg-muted" />
          </div>
          <div className="mt-2 h-32 w-full rounded-md bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <LinkWrapper
      href={tweetUrl}
      isExternal={true}
      className={cn(
        "group block w-full cursor-pointer rounded-xl border p-2 transition-colors hover:bg-muted/50",
        className
      )}
      aria-label={`View quoted tweet by ${tweet?.user?.name ?? tweet?.user?.screen_name ?? "user"}`}
    >
      {/* Single column layout with avatar in header */}
      <div className="flex flex-col">
        {/* Header with integrated avatar */}
        <header className="mb-1 flex items-center gap-2">
          <LinkWrapper href={profileUrl} isExternal={true}>
            <Avatar className="h-6 w-6 ring-1 ring-border">
              <AvatarImage
                src={tweet?.user?.profile_image_url_https}
                alt={`Avatar of ${tweet?.user?.name}`}
              />
              <AvatarFallback>
                {tweet?.user?.name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </LinkWrapper>

          <div className="flex flex-1 items-center justify-between">
            <TweetHeader staticUser={tweet?.user}>
              <time
                className="truncate text-sm text-muted-foreground"
                dateTime={tweet?.tweet_created_at}
              >
                · {formatRelativeTime(tweet?.tweet_created_at)}
              </time>
            </TweetHeader>
            <TweetMenu
              tweetUrl={tweetUrl}
              profileUrl={profileUrl}
              screenName={tweet?.user?.screen_name || ""}
              fullText={tweet?.full_text || tweet?.text || ""}
            />
          </div>
        </header>

        {/* Body */}
        <TweetBody
          tweet={tweet}
          characterLimit={characterLimit}
          showFullContent={showFullContent}
          highlightQuery={highlightQuery}
          className="mb-1"
        />

        {/* Media */}
        {media && (
          <div className="mt-2 block shrink-0">
            <TweetMedia media={media} />
          </div>
        )}

        {/* Tweet source */}
        {tweetSource && <div className="mt-1">{tweetSource}</div>}
      </div>
    </LinkWrapper>
  );
};

QuoteTweetCard.displayName = "QuoteTweetCard";
