"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils/utils";
import Link from "next/link";
import { UserProfileHeader } from "@/features/landing/ui/components/UserProfileHeader";

const waitlistUserCardVariants = cva(
  [
    "group w-fit rounded-lg p-4 transition-colors",
    "hover:bg-accent focus-within:bg-accent",
    "flex items-center gap-4",
  ],
  {
    variants: {},
    defaultVariants: {},
  }
);

export interface WaitlistUserCardProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof waitlistUserCardVariants> {
  avatarUrl: string;
  displayName: string;
  username: string;
  pro?: boolean;
}

export const WaitlistUserCard = React.forwardRef<
  HTMLElement,
  WaitlistUserCardProps
>(({ avatarUrl, displayName, username, pro, className, ...props }, ref) => {
  return (
    <article
      ref={ref}
      aria-label={`Waitlist user card for ${displayName}`}
      {...props}
    >
      <Link
        href={`https://x.com/${username}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open @${username}'s X/Twitter profile`}
        className={cn(waitlistUserCardVariants({ className }))}
      >
        <UserProfileHeader
          avatarUrl={avatarUrl}
          displayName={displayName}
          username={username}
          pro={pro}
        />
      </Link>
    </article>
  );
});

WaitlistUserCard.displayName = "WaitlistUserCard";
