"use client";

import * as React from "react";
import Link from "next/link";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/shared/ui/components/Avatar";
import { NewReleasesIcon } from "@/shared/ui/components/icons";

interface UserProfileHeaderProps {
  avatarUrl: string;
  displayName: string;
  username: string;
  pro?: boolean;
  // Add any additional props needed for your new UI
}

export function UserProfileHeader({
  avatarUrl,
  displayName,
  username,
  pro,
}: UserProfileHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <Avatar>
        <AvatarImage
          src={avatarUrl}
          alt={`Profile picture of ${displayName}`}
        />
        <AvatarFallback>
          {displayName?.charAt(0).toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>

      <address className="flex flex-col not-italic">
        <div className="flex items-center gap-[2px]">
          {displayName && (
            <Link
              href={`https://x.com/${username}`}
              className="text-base font-medium hover:underline"
              aria-label={`View ${displayName}'s profile`}
            >
              {displayName}
            </Link>
          )}
          {pro && (
            <NewReleasesIcon
              className="h-[14px] w-[14px] fill-current"
              aria-hidden="true"
            />
          )}
        </div>
        {username && (
          <Link
            href={`https://x.com/${username}`}
            className="font-mono text-sm font-medium text-muted-foreground hover:underline"
            aria-label={`View @${username}'s profile`}
          >
            @{username}
          </Link>
        )}
      </address>
    </div>
  );
}
