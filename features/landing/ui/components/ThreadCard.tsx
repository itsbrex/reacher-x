"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
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

/**
 * Define just the container variants with cva.
 * We'll control element sizes outside of cva so we can fully customize
 * the Avatar, text, icons, etc. for sm/md/lg + responsive.
 */
const threadCardVariants = cva(
  // Base container classes
  "flex gap-4 w-full rounded-sm px-4 py-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition-colors",
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
  /**
   * Controls the size of avatar, text, etc.
   * Note: On small screen devices, everything automatically defaults to "sm".
   */
  size?: "sm" | "md" | "lg";

  detailHref: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;

  displayName?: string;
  username?: string;
  pro?: boolean;
  dateTime?: string;
  /** The raw body if you want to store it, but you won't parse it here. */
  body?: string;
  /** The already-parsed HTML from server */
  parsedBody: string;

  repliesCount?: string;
  repostsCount?: string;
  likesCount?: string;
  bookmarksCount?: string;
  impressionsCount?: string;

  tweetUrl?: string;
}

export const ThreadCard = React.forwardRef<HTMLElement, ThreadCardProps>(
  (
    {
      detailHref,
      leftSlot,
      rightSlot,
      displayName,
      username,
      pro,
      dateTime,
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
    /**
     * Sizing logic for each element.
     * Base classes = mobile/sm. Then add md: overrides
     * for bigger screens and different size props.
     */

    // Avatar
    const avatarClass = cn(
      // Base: small devices => sm
      "h-8 w-8",
      // On screens >= md breakpoint, switch based on the size prop
      size === "sm" && "md:h-8 md:w-8",
      size === "md" && "md:h-9 md:w-9",
      size === "lg" && "md:h-10 md:w-10"
    );

    // Display name (e.g. "John Doe")
    const displayNameClass = cn(
      "text-base", // base for mobile => sm
      size === "sm" && "md:text-base",
      size === "md" && "md:text-lg",
      size === "lg" && "md:text-xl" // e.g. 20px on bigger screens
    );

    // Pro icon (NewReleasesIcon)
    const newReleasesIconClass = cn(
      "w-3 h-3",
      size === "sm" && "md:w-3 md:h-3",
      size === "md" && "md:w-4 md:h-4",
      size === "lg" && "md:w-4 md:h-4"
    );

    // Username and time
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

    // Body text
    const bodyClass = cn(
      "text-base",
      size === "sm" && "md:text-base",
      size === "md" && "md:text-xl",
      size === "lg" && "md:text-2xl"
    );

    // Container classes from cva
    const containerClasses = cn(threadCardVariants({ bordered }), className);
    const tweetLink = tweetUrl || "https://twitter.com";

    return (
      <article ref={ref} {...props}>
        <Link href={detailHref} className={cn(containerClasses, "group")}>
          {/* Left side: Avatar + vertical separator */}
          <div className="flex flex-col items-center gap-2">
            <Avatar className={avatarClass}>
              <AvatarImage src="https://avatars.githubusercontent.com/u/85483006?v=4" />
              <AvatarFallback>UI</AvatarFallback>
            </Avatar>
            <Separator orientation="vertical" />
          </div>

          {/* Main content */}
          <main className="flex">
            <section className="flex flex-col gap-4">
              <header className="mt-1 flex items-center justify-between gap-4">
                <div className="grid grid-cols-[auto,auto] items-center gap-1">
                  <address className="grid grid-cols-[auto,auto,auto] items-center gap-1 not-italic">
                    {displayName && (
                      <Link
                        href={`https://x.com/${username}`}
                        className={cn(
                          displayNameClass,
                          "truncate font-medium hover:underline"
                        )}
                      >
                        {displayName}
                      </Link>
                    )}
                    {pro && (
                      <NewReleasesIcon
                        className={cn(newReleasesIconClass, "fill-current")}
                      />
                    )}
                    {username && (
                      <Link
                        href={`https://x.com/${username}`}
                        className={cn(
                          usernameClass,
                          "truncate font-mono font-medium text-muted-foreground hover:underline"
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
                        "truncate text-muted-foreground"
                      )}
                      dateTime={dateTime}
                    >
                      {dateTime}
                    </time>
                  )}
                </div>

                <Button size="icon" variant="ghost" className="h-6 w-6">
                  <MoreHorizIcon className="fill-current" />
                </Button>
              </header>

              {/* Body / parsed HTML */}
              {parsedBody ? (
                <div
                  className={cn(
                    bodyClass,
                    // This applies text-neutral-500 + font-mono to all <a> inside
                    "[&_a]:font-mono [&_a]:text-neutral-500"
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
                      "[&_a]:font-mono [&_a]:text-neutral-500"
                    )}
                  >
                    {body}
                  </p>
                )
              )}

              {leftSlot && <div className="shrink-0">{leftSlot}</div>}

              {/* Footer stats */}
              <footer className="flex items-center justify-between gap-6 text-xs text-muted-foreground">
                {repliesCount && (
                  <a
                    href={tweetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <QuickPhrasesIcon className="fill-current" />
                    {repliesCount}
                  </a>
                )}
                {repostsCount && (
                  <a
                    href={tweetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RepeatIcon className="fill-current" />
                    {repostsCount}
                  </a>
                )}
                {likesCount && (
                  <a
                    href={tweetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FavoriteIcon className="fill-current" />
                    {likesCount}
                  </a>
                )}
                {bookmarksCount && (
                  <a
                    href={tweetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BookmarkIcon className="fill-current" />
                    {bookmarksCount}
                  </a>
                )}
                {impressionsCount && (
                  <a
                    href={tweetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <InsertChartIcon className="fill-current" />
                    {impressionsCount}
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
