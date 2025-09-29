// features/webapp/ui/components/TweetMenu.tsx
"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/components/DropdownMenu";
import { Button } from "@/shared/ui/components/Button";
import {
  ContentCopyIcon,
  LinkIcon,
  MoreHorizIcon,
  OpenInNewIcon,
  PersonIcon,
} from "@/shared/ui/components/icons";
import { useToast } from "@/shared/ui/hooks/useToast";
import { useProfile } from "@/features/profile/contexts/ProfileContext";

export function TweetMenu({
  tweetUrl,
  profileUrl,
  screenName,
  fullText,
  className,
}: {
  tweetUrl: string;
  profileUrl: string;
  screenName: string;
  fullText?: string;
  className?: string;
}) {
  const { toast } = useToast();
  const { openProfile } = useProfile();

  const handleCopyLink = (event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(tweetUrl).then(
      () =>
        toast({
          title: "☑︎ Copied!",
          description: "Link copied to clipboard.",
        }),
      () =>
        toast({
          variant: "destructive",
          title: "☒ Error!",
          description: "Unable to copy link.",
        })
    );
  };

  const handleViewTweet = (event: React.MouseEvent) => {
    event.stopPropagation();
    window.open(tweetUrl, "_blank");
  };

  const handleCopyPostText = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!fullText) return;
    navigator.clipboard.writeText(fullText).then(
      () => toast({ title: "☑︎ Copied!", description: "Full text copied." }),
      () =>
        toast({
          variant: "destructive",
          title: "☒ Error!",
          description: "Unable to copy.",
        })
    );
  };

  const handleCopyProfileLink = (event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(profileUrl).then(
      () =>
        toast({ title: "☑︎ Copied!", description: "Profile link copied." }),
      () =>
        toast({
          variant: "destructive",
          title: "☒ Error!",
          description: "Unable to copy.",
        })
    );
  };

  const handleViewProfile = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (screenName) openProfile({ username: screenName });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="xsIcon"
          variant="ghost"
          onClick={(e) => e.stopPropagation()}
          aria-label="More options"
          className={className}
        >
          <MoreHorizIcon className="fill-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>↳ Menu</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleViewTweet}>
          <OpenInNewIcon className="fill-current" aria-hidden="true" />
          Open on X (Twitter)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyPostText}>
          <ContentCopyIcon className="fill-current" aria-hidden="true" />
          Copy post full text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          <LinkIcon className="fill-current" aria-hidden="true" />
          Copy post link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleViewProfile}>
          <PersonIcon className="fill-current" aria-hidden="true" />
          View profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyProfileLink}>
          <LinkIcon className="fill-current" aria-hidden="true" />
          Copy profile link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
