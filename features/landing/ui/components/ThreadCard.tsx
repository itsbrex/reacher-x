"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";

// date-fns imports
import { format, formatDistanceToNow, differenceInDays } from "date-fns";

import { cn } from "@/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/ui/components/Avatar";
import { Separator } from "@/shared/ui/components/Separator";

import {
  BookmarkIcon,
  FavoriteIcon,
  InsertChartIcon,
  MoreHorizIcon,
  QuickPhrasesIcon,
  RepeatIcon,
  NewReleasesIcon,
} from "@/shared/ui/components/icons";
import { Button } from "@/shared/ui/components/Button";

/* ----------------------------------------------------------------------------
   Helper Functions
   ---------------------------------------------------------------------------*/

/**
 * Converts a date string into the desired "production-grade" format:
 * - If the date is older than 7 days, use a format like "· Oct 4, 2022".
 * - Otherwise, use a relative format like "2 days ago", "3 hours ago", etc.
 */
function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return ""; // Fallback if invalid date

  const now = new Date();
  const dayDiff = differenceInDays(now, date);

  // If older than 7 days => "· Oct 4, 2022"
  if (dayDiff >= 7) {
    return `· ${format(date, "MMM d, yyyy")}`;
  }

  // Otherwise => relative time: "3 days ago", "2 hours ago", etc.
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Abbreviates large values to "1.2K", "3.4M", etc.
 * - If < 1,000 => returns the original number
 * - If >= 1,000 => abbreviates with K, M, B, T
 */
function formatLargeNumber(value: number): string {
  if (value < 1000) return String(value);

  const suffixes = ["", "K", "M", "B", "T"];
  let suffixIndex = 0;
  let num = value;

  while (num >= 1000 && suffixIndex < suffixes.length - 1) {
    num /= 1000;
    suffixIndex++;
  }

  // Remove trailing .0 if any
  const formatted = num.toFixed(1).replace(/\.0$/, "");
  return `${formatted}${suffixes[suffixIndex]}`;
}

/* ----------------------------------------------------------------------------
   ThreadCard component
   ---------------------------------------------------------------------------*/

const threadCardVariants = cva(
  "flex gap-4 w-full rounded-sm px-4 pt-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition-colors",
  {
    variants: {
      bordered: {
        true: "border-b border-muted",
        false: "",
      },
    },
    defaultVariants: {
      bordered: false,
    },
  }
);

export interface ThreadCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children">,
    VariantProps<typeof threadCardVariants> {
  size?: "sm" | "md" | "lg";

  detailHref: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;

  avatarUrl?: string;
  thread?: boolean;
  displayName?: string;
  username?: string;
  pro?: boolean;

  /**
   * dateTime should be a valid ISO date string (or any parseable date).
   * We'll parse it and format accordingly.
   */
  dateTime?: string;

  replyingTo?: string | null;
  body?: string;
  parsedBody?: string;

  repliesCount?: string | number;
  repostsCount?: string | number;
  likesCount?: string | number;
  bookmarksCount?: string | number;
  impressionsCount?: string | number;

  tweetUrl?: string;
}

export const ThreadCard = React.forwardRef<HTMLElement, ThreadCardProps>(
  (
    {
      detailHref,
      leftSlot,
      rightSlot,
      avatarUrl,
      thread,
      displayName,
      username,
      pro,
      dateTime,
      replyingTo,
      body,
      parsedBody,
      repliesCount,
      repostsCount,
      likesCount,
      bookmarksCount,
      impressionsCount,
      tweetUrl,
      size = "md",
      bordered,
      className,
      ...props
    },
    ref
  ) => {
    // Sizing logic for each element.
    const avatarClass = cn(
      "h-8 w-8", // base = sm on mobile
      size === "sm" && "md:h-8 md:w-8",
      size === "md" && "md:h-9 md:w-9",
      size === "lg" && "md:h-10 md:w-10"
    );

    const rightColumnClass = cn(
      "pb-4",
      size === "sm" && "md:pb-4",
      size === "md" && "md:pb-6",
      size === "lg" && "md:pb-12"
    );

    const displayNameClass = cn(
      "text-base",
      size === "sm" && "md:text-base",
      size === "md" && "md:text-lg",
      size === "lg" && "md:text-xl"
    );

    const newReleasesIconClass = cn(
      "w-3 h-3",
      size === "sm" && "md:w-3 md:h-3",
      size === "md" && "md:w-4 md:h-4",
      size === "lg" && "md:w-4 md:h-4"
    );

    const usernameClass = cn(
      "text-sm",
      size === "sm" && "md:text-sm",
      size === "md" && "md:text-base",
      size === "lg" && "md:text-lg"
    );

    const timeClass = cn(
      "text-sm",
      size === "sm" && "md:text-sm",
      size === "md" && "md:text-base",
      size === "lg" && "md:text-lg"
    );

    const replyingToClass = cn(
      "text-sm",
      size === "sm" && "md:text-sm",
      size === "md" && "md:text-sm",
      size === "lg" && "md:text-base"
    );

    const bodyClass = cn(
      "text-base",
      size === "sm" && "md:text-base",
      size === "md" && "md:text-xl",
      size === "lg" && "md:text-2xl"
    );

    const containerClasses = cn(threadCardVariants({ bordered }), className);
    const tweetLink = tweetUrl || "https://twitter.com";

    // Format the date/time:
    const displayTime = formatRelativeTime(dateTime);

    // Parse counts for large number format (safe parse, fallback to 0)
    const replies = formatLargeNumber(Number(repliesCount ?? 0));
    const reposts = formatLargeNumber(Number(repostsCount ?? 0));
    const likes = formatLargeNumber(Number(likesCount ?? 0));
    const bookmarks = formatLargeNumber(Number(bookmarksCount ?? 0));
    const impressions = formatLargeNumber(Number(impressionsCount ?? 0));

    return (
      <article ref={ref} {...props}>
        <Link href={detailHref} className={cn(containerClasses, "group")}>
          {/* Left side: Avatar + vertical separator */}
          <div className="grid grid-rows-[auto_1fr] place-items-center gap-2">
            <Link href={`https://x.com/${username}`}>
              <Avatar
                className={cn(
                  avatarClass,
                  "ease-[cubic-bezier(0.25, 1, 0.5, 1)] duration-300"
                )}
              >
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>UI</AvatarFallback>
              </Avatar>
            </Link>
            {thread && <Separator orientation="vertical" className="w-[2px]" />}
          </div>

          <main>
            <section className={cn(rightColumnClass, "flex flex-col gap-4")}>
              <header className="mt-1 flex items-center justify-between gap-4">
                <div className="grid grid-cols-[auto,auto] items-center gap-1">
                  <address className="grid grid-cols-[auto,auto,auto] items-center gap-1 not-italic">
                    {displayName && (
                      <Link
                        href={`https://x.com/${username}`}
                        className={cn(
                          displayNameClass,
                          "ease-[cubic-bezier(0.25, 1, 0.5, 1)] whitespace-nowrap font-medium duration-300 hover:underline"
                        )}
                      >
                        {displayName}
                      </Link>
                    )}
                    {pro && (
                      <NewReleasesIcon
                        className={cn(
                          newReleasesIconClass,
                          "ease-[cubic-bezier(0.25, 1, 0.5, 1)] fill-current duration-300"
                        )}
                      />
                    )}
                    {username && (
                      <Link
                        href={`https://x.com/${username}`}
                        className={cn(
                          usernameClass,
                          "ease-[cubic-bezier(0.25, 1, 0.5, 1)] truncate font-mono font-medium text-muted-foreground duration-300 hover:underline"
                        )}
                      >
                        @{username}
                      </Link>
                    )}
                  </address>

                  {dateTime && (
                    <time
                      className={cn(
                        timeClass,
                        "ease-[cubic-bezier(0.25, 1, 0.5, 1)] truncate text-muted-foreground duration-300"
                      )}
                      dateTime={dateTime}
                    >
                      {displayTime}
                    </time>
                  )}
                </div>

                <Button size="icon" variant="ghost" className="h-6 w-6">
                  <MoreHorizIcon className="fill-neutral-500" />
                </Button>
              </header>

              {replyingTo && (
                <p
                  className={cn(
                    replyingToClass,
                    "ease-[cubic-bezier(0.25, 1, 0.5, 1)] whitespace-pre-line font-medium text-neutral-500 duration-300"
                  )}
                >
                  Replying to{" "}
                  <Link
                    href={`https://x.com/${replyingTo}`}
                    className="font-mono text-foreground hover:underline"
                  >
                    @{replyingTo}
                  </Link>
                </p>
              )}

              {/* Body / parsed HTML */}
              {parsedBody ? (
                <p
                  lang="auto"
                  className={cn(
                    bodyClass,
                    "word-break ease-[cubic-bezier(0.25, 1, 0.5, 1)] hyphens-auto whitespace-pre-line duration-300 [&_a]:text-neutral-500"
                  )}
                  dangerouslySetInnerHTML={{
                    __html: parsedBody,
                  }}
                />
              ) : (
                body && (
                  <p
                    className={cn(
                      bodyClass,
                      "word-break ease-[cubic-bezier(0.25, 1, 0.5, 1)] hyphens-auto whitespace-pre-line duration-300 [&_a]:text-neutral-500"
                    )}
                  >
                    {body}
                  </p>
                )
              )}

              {leftSlot && <div className="shrink-0">{leftSlot}</div>}

              <footer className="flex items-center justify-between gap-6 text-xs text-muted-foreground">
                {repliesCount !== undefined && (
                  <a
                    href={tweetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <QuickPhrasesIcon className="fill-current" />
                    {replies}
                  </a>
                )}
                {repostsCount !== undefined && (
                  <a
                    href={tweetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RepeatIcon className="fill-current" />
                    {reposts}
                  </a>
                )}
                {likesCount !== undefined && (
                  <a
                    href={tweetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FavoriteIcon className="fill-current" />
                    {likes}
                  </a>
                )}
                {bookmarksCount !== undefined && (
                  <a
                    href={tweetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BookmarkIcon className="fill-current" />
                    {bookmarks}
                  </a>
                )}
                {impressionsCount !== undefined && (
                  <a
                    href={tweetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <InsertChartIcon className="fill-current" />
                    {impressions}
                  </a>
                )}
              </footer>
            </section>

            {rightSlot && <div>{rightSlot}</div>}
          </main>
        </Link>
      </article>
    );
  }
);

ThreadCard.displayName = "ThreadCard";
