"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils/utils";
import { NewReleasesIcon } from "@/shared/ui/components/icons";
import Link from "next/link";

export interface ThreadHeaderProps {
  name?: string | null;
  screenName?: string | null;
  verified?: boolean | null;
  children?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ThreadHeader({
  name,
  screenName,
  verified,
  children,
  className,
  size = "md",
}: ThreadHeaderProps) {
  const nameClass = cn(
    "font-medium text-sm",
    size === "sm" && "md:text-sm",
    size === "md" && "md:text-base",
    size === "lg" && "md:text-lg"
  );
  const screenNameClass = cn(
    "font-mono text-muted-foreground text-sm",
    size === "sm" && "md:text-sm",
    size === "md" && "md:text-base",
    size === "lg" && "md:text-lg"
  );

  const newReleasesIconClass = cn(
    "fill-current",
    size === "sm" && "w-3 h-3",
    size === "md" && "w-4 h-4",
    size === "lg" && "w-4 h-4"
  );

  const profileUrl = screenName ? `https://x.com/${screenName}` : undefined;

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
        {name && profileUrl ? (
          <Link
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              nameClass,
              "mr-1 inline-block max-w-full truncate hover:underline"
            )}
            aria-label={`View ${name}'s profile`}
          >
            {name}
          </Link>
        ) : (
          name && <span className={nameClass}>{name}</span>
        )}

        {verified && (
          <NewReleasesIcon
            className={newReleasesIconClass}
            aria-hidden="true"
          />
        )}

        {screenName && profileUrl ? (
          <Link
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              screenNameClass,
              "inline-block max-w-full truncate font-medium hover:underline"
            )}
            aria-label={`View @${screenName}'s profile`}
          >
            @{screenName}
          </Link>
        ) : (
          screenName && <span className={screenNameClass}>@{screenName}</span>
        )}
      </div>
      {children}
    </div>
  );
}
