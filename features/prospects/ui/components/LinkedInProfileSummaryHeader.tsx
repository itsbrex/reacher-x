"use client";

import * as React from "react";
import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/ui/components/Avatar";
import { LinkIcon, NewReleasesIcon } from "@/shared/ui/components/icons";
import { cn, formatLargeNumber } from "@/shared/lib/utils";

type LinkedInSummaryPosition = {
  companyName: string;
  companyLogo?: string;
  isCurrent?: boolean;
};

type LinkedInSummaryWebsite = {
  url: string;
  category?: string;
};

export type LinkedInProfileSummaryData = {
  displayName: string;
  firstName?: string;
  headline?: string;
  profilePictureUrl?: string;
  backgroundImageUrl?: string;
  profileUrl?: string;
  isPremium?: boolean;
  location?: string;
  followerCount?: number;
  connectionCount?: number;
  contact?: {
    websites?: LinkedInSummaryWebsite[];
  };
  positions?: LinkedInSummaryPosition[];
  currentCompany?: {
    name: string;
    website?: string;
    logoUrl?: string;
  };
};

export interface LinkedInProfileSummaryHeaderProps {
  profile: LinkedInProfileSummaryData;
  actions?: React.ReactNode;
  className?: string;
  bannerClassName?: string;
  contentClassName?: string;
  avatarClassName?: string;
  linkName?: boolean;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinkedInProfileSummaryHeader({
  profile,
  actions,
  className,
  bannerClassName,
  contentClassName,
  avatarClassName,
  linkName = true,
}: LinkedInProfileSummaryHeaderProps) {
  const profileUrl = profile.profileUrl || undefined;
  const currentPosition = profile.positions?.find((position) =>
    Boolean(position.isCurrent)
  );
  const displayedCompany =
    currentPosition || profile.currentCompany
      ? {
          companyName:
            currentPosition?.companyName ?? profile.currentCompany?.name ?? "",
          companyLogo:
            currentPosition?.companyLogo ?? profile.currentCompany?.logoUrl,
          isCurrent:
            currentPosition?.isCurrent ?? Boolean(profile.currentCompany),
        }
      : undefined;
  const primaryWebsite =
    profile.contact?.websites?.[0] ||
    (profile.currentCompany?.website
      ? { url: profile.currentCompany.website, category: "COMPANY" }
      : undefined);
  const formattedFollowerCount =
    (profile.followerCount ?? 0) > 0
      ? formatLargeNumber(profile.followerCount ?? 0)
      : undefined;
  const formattedConnectionCount =
    (profile.connectionCount ?? 0) > 0
      ? `${formatLargeNumber(profile.connectionCount ?? 0)}+`
      : undefined;
  const fallbackInitial =
    profile.firstName?.charAt(0).toUpperCase() ||
    profile.displayName.charAt(0).toUpperCase() ||
    "?";

  return (
    <section
      className={cn("border-b pb-4", className)}
      aria-label="Profile summary"
    >
      {profile.backgroundImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.backgroundImageUrl}
          alt={`${profile.displayName} banner`}
          className={cn("h-44 w-full border-b object-cover", bannerClassName)}
        />
      ) : (
        <div
          className={cn("bg-muted h-44 w-full border-b", bannerClassName)}
          aria-hidden="true"
        />
      )}

      <div className={cn("mx-4 -mt-7 space-y-3", contentClassName)}>
        <header className="space-y-3">
          <Avatar
            className={cn(
              "ring-border ring-offset-background size-12 ring-1 ring-offset-2",
              avatarClassName
            )}
          >
            {profile.profilePictureUrl ? (
              <AvatarImage
                src={profile.profilePictureUrl}
                alt={profile.displayName}
              />
            ) : null}
            <AvatarFallback>{fallbackInitial}</AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1">
                {profileUrl && linkName ? (
                  <Link
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block min-w-0 truncate text-sm font-medium hover:underline"
                    title={profile.displayName}
                  >
                    {profile.displayName}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-medium">
                    {profile.displayName}
                  </span>
                )}
                {profile.isPremium ? (
                  <NewReleasesIcon
                    className="size-3.5 shrink-0 fill-current"
                    aria-hidden="true"
                  />
                ) : null}
              </div>

              {actions ? (
                <div className="flex shrink-0 items-center gap-1">
                  {actions}
                </div>
              ) : null}
            </div>

            {profile.headline ? (
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {profile.headline}
              </p>
            ) : null}
            {profile.location ? (
              <p className="text-muted-foreground text-xs">
                {profile.location}
              </p>
            ) : null}
          </div>
        </header>

        {(() => {
          const items: React.ReactElement[] = [];
          if (formattedConnectionCount) {
            items.push(
              <li key="conn" className="inline-flex items-center">
                <span className="text-foreground font-mono font-medium">
                  {formattedConnectionCount}
                </span>
                &nbsp;connections
              </li>
            );
          }
          if (formattedFollowerCount) {
            items.push(
              <li key="foll" className="inline-flex items-center">
                <span className="text-foreground font-mono font-medium">
                  {formattedFollowerCount}
                </span>
                &nbsp;followers
              </li>
            );
          }
          if (displayedCompany) {
            items.push(
              <li key="co" className="inline-flex items-center gap-1">
                {displayedCompany.companyLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayedCompany.companyLogo}
                    alt=""
                    className="size-3.5 rounded-sm object-contain"
                  />
                ) : null}
                <span className="text-foreground font-medium">
                  {displayedCompany.companyName}
                </span>
              </li>
            );
          }
          if (primaryWebsite) {
            items.push(
              <li key="web" className="inline-flex items-center gap-1">
                <LinkIcon className="fill-muted-foreground" />
                <Link
                  href={primaryWebsite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground font-mono font-medium hover:underline"
                  title={primaryWebsite.url}
                >
                  {safeHostname(primaryWebsite.url)}
                </Link>
              </li>
            );
          }

          if (items.length === 0) {
            return null;
          }

          return (
            <ul
              className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-2 text-sm"
              role="list"
              aria-label="Profile stats"
            >
              {items.map((item, index) => (
                <React.Fragment key={item.key ?? `profile-stat-${index}`}>
                  {index > 0 ? (
                    <li aria-hidden="true" className="text-muted-foreground">
                      ·
                    </li>
                  ) : null}
                  {item}
                </React.Fragment>
              ))}
            </ul>
          );
        })()}
      </div>
    </section>
  );
}
