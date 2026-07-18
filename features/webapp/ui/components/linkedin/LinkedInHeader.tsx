// features/webapp/ui/components/linkedin/LinkedInHeader.tsx
"use client";

import * as React from "react";
import type { UnifiedPost } from "@/shared/lib/platforms/types";
import { cn } from "@/shared/lib/utils";
import { formatRelativeTime } from "@/shared/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/ui/components/Avatar";
import type { LinkedInProfileIdentity } from "@/shared/lib/linkedin/profile";

export interface LinkedInHeaderProps {
  post: UnifiedPost;
  children?: React.ReactNode; // actions (menu)
  className?: string;
  size?: "sm" | "md";
  disableProfileNavigation?: boolean;
  profileIdentity?: LinkedInProfileIdentity | null;
  onOpenProfile?: (identity: LinkedInProfileIdentity) => void;
}

function isOrganizationProfile(url?: string | null): boolean {
  if (!url) return false;
  return /\/(company|school)\//i.test(url);
}

function extractFollowers(raw: unknown): number | undefined {
  try {
    const r = (raw ?? {}) as Record<string, unknown>;
    const val = r["author"] as unknown;
    const author =
      typeof val === "object" && val !== null
        ? (val as Record<string, unknown>)
        : undefined;
    const guesses = [
      "followers",
      "followersCount",
      "followerCount",
      "numFollowers",
      "followers_count",
    ] as const;
    for (const key of guesses) {
      const v = author ? (author[key] as unknown) : undefined;
      if (typeof v === "number" && v >= 0) return v;
      if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
    }
    const headline = author ? (author["headline"] as unknown) : undefined;
    if (typeof headline === "string" && headline) {
      const text = headline;
      const m = text.match(
        /(\d[\d.,\s\u00A0\u202F]*)(?:\s*([kmbKMB]|mln|mio))?\s*(?:follower|followers|seguidores|abonnés|abbonati|seguaci)\b/i
      );
      if (m) {
        const numPart = m[1];
        let suffix = (m[2] || "").toLowerCase();
        if (suffix === "mln" || suffix === "mio") suffix = "m";

        if (suffix) {
          let baseStr = numPart
            .replace(/[\s\u00A0\u202F]/g, "")
            .replace(/,/g, ".");
          const parts = baseStr.split(".");
          if (parts.length > 2) {
            baseStr = `${parts[0]}.${parts[1]}`;
          }
          const base = parseFloat(baseStr);
          const mult =
            suffix === "k"
              ? 1e3
              : suffix === "m"
                ? 1e6
                : suffix === "b"
                  ? 1e9
                  : 1;
          if (!Number.isNaN(base)) return Math.round(base * mult);
        } else {
          const digitsOnly = numPart.replace(/[^\d]/g, "");
          if (digitsOnly.length > 0) return Number(digitsOnly);
        }
      }
    }
  } catch {}
  return undefined;
}

function getRawAuthorType(raw: unknown): string | undefined {
  const container =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : undefined;
  const authorVal = container ? (container["author"] as unknown) : undefined;
  const authorObj =
    typeof authorVal === "object" && authorVal !== null
      ? (authorVal as Record<string, unknown>)
      : undefined;
  const t = authorObj ? (authorObj["type"] as unknown) : undefined;
  return typeof t === "string" ? t : undefined;
}

export const LinkedInHeader: React.FC<LinkedInHeaderProps> = ({
  post,
  children,
  className,
  size = "md",
  disableProfileNavigation = false,
  profileIdentity,
  onOpenProfile,
}) => {
  const profileUrl = post?.author?.profileUrl || post?.author?.handle || "";
  const authorName = post?.author?.name || "LinkedIn user";
  const rawType = getRawAuthorType(post?.raw);
  const org =
    (post?.author?.type || rawType || "").toUpperCase() === "COMPANY" ||
    isOrganizationProfile(profileUrl);

  const createdAtIso =
    typeof post?.createdAt === "number" &&
    Number.isFinite(post.createdAt) &&
    post.createdAt > 0
      ? new Date(post.createdAt).toISOString()
      : "";

  const followers = org ? extractFollowers(post?.raw) : undefined;
  const canOpenProfile = Boolean(
    !disableProfileNavigation && profileIdentity && onOpenProfile
  );

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (profileIdentity) {
      onOpenProfile?.(profileIdentity);
    }
  };

  return (
    <header className={cn("flex min-w-0 items-start gap-2", className)}>
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {/* Avatar */}
        {!canOpenProfile ? (
          <Avatar
            className={cn(
              "ring-border h-8 w-8 ring-1",
              org ? "rounded-md" : "rounded-full"
            )}
          >
            <AvatarImage
              src={post?.author?.avatarUrl}
              alt={`Avatar of ${authorName}`}
              className={cn(org ? "rounded-md" : undefined)}
            />
            <AvatarFallback className={cn(org ? "rounded-md" : undefined)}>
              {authorName?.charAt(0).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        ) : (
          <button
            type="button"
            onClick={handleProfileClick}
            aria-label={`View ${authorName} profile`}
          >
            <Avatar
              className={cn(
                "ring-border h-8 w-8 ring-1",
                org ? "rounded-md" : "rounded-full"
              )}
            >
              <AvatarImage
                src={post?.author?.avatarUrl}
                alt={`Avatar of ${authorName}`}
                className={cn(org ? "rounded-md" : undefined)}
              />
              <AvatarFallback className={cn(org ? "rounded-md" : undefined)}>
                {authorName?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </button>
        )}

        {/* Name and meta */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-0.5 overflow-hidden">
            {!canOpenProfile ? (
              <span
                className={cn(
                  "min-w-0 truncate font-medium",
                  size === "md" ? "text-sm" : "text-xs"
                )}
                title={authorName}
              >
                {authorName}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleProfileClick}
                className={cn(
                  "min-w-0 truncate text-left font-medium hover:underline",
                  size === "md" ? "text-sm" : "text-xs"
                )}
                title={authorName}
              >
                {authorName}
              </button>
            )}
            {createdAtIso && (
              <div className="shrink-0">
                <time
                  className={cn(
                    "text-muted-foreground shrink-0",
                    size === "md" ? "text-sm" : "text-xs"
                  )}
                  dateTime={createdAtIso}
                >
                  · {formatRelativeTime(createdAtIso)}
                </time>
              </div>
            )}
          </div>
          <span className="text-muted-foreground inline-block max-w-3xs truncate text-xs">
            {org
              ? followers
                ? `${Intl.NumberFormat(undefined, {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(followers)} followers`
                : null
              : post?.author?.headline || null}
          </span>
        </div>
      </div>

      {/* Actions (3-dots) */}
      <div className="ml-auto shrink-0">{children}</div>
    </header>
  );
};
