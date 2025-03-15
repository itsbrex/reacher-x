// features/landing/ui/components/TweetFooter.tsx
"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatLargeNumber } from "@/shared/lib/utils/format";
import {
  QuickPhrasesIcon,
  RepeatIcon,
  FavoriteIcon,
  InsertChartIcon,
} from "@/shared/ui/components/icons";
import { Tweet } from "@/app/(landing)/threads/types";
import { Skeleton } from "@/shared/ui/components/Skeleton";

interface TweetFooterProps {
  threadId: string;
  tweetId: string | undefined;
  tweetUrl: string;
}

export function TweetFooter({ threadId, tweetId, tweetUrl }: TweetFooterProps) {
  const getDynamicThreadData = useAction(api.socialdata.getDynamicThreadData);
  const [metrics, setMetrics] = useState<Tweet | null>(null);

  useEffect(() => {
    getDynamicThreadData({ threadId })
      .then((data) => {
        const tweetData = data.tweets.find((t: Tweet) => t.id_str === tweetId);
        if (!tweetData) {
          console.error(
            `Tweet with id ${tweetId} not found in thread ${threadId}`
          );
        }
        setMetrics(tweetData || null);
      })
      .catch((error) => {
        console.error("Error fetching dynamic thread data:", error);
      });
  }, [threadId, tweetId, getDynamicThreadData]);

  if (!metrics)
    return (
      <footer className="flex justify-between">
        <span className="flex gap-1">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-8" />
        </span>
        <span className="flex gap-1">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-8" />
        </span>
        <span className="flex gap-1">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-8" />
        </span>
        <span className="flex gap-1">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-8" />
        </span>
        <span className="flex gap-1">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-8" />
        </span>
      </footer>
    );

  const formattedReplyCount = formatLargeNumber(
    Number(metrics.reply_count ?? 0)
  );
  const repeatSum =
    Number(metrics.quote_count ?? 0) + Number(metrics.retweet_count ?? 0);
  const formattedRepeatSum = formatLargeNumber(repeatSum);
  const formattedFavoriteCount = formatLargeNumber(
    Number(metrics.favorite_count ?? 0)
  );
  const formattedViewsCount = formatLargeNumber(
    Number(metrics.views_count ?? 0)
  );

  return (
    <footer className="flex items-center justify-between gap-6 text-xs">
      {metrics.reply_count !== undefined && (
        <Link
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-mono text-muted-foreground hover:underline"
          onClick={(e) => e.stopPropagation()}
          aria-label={`View replies (${formattedReplyCount})`}
        >
          <QuickPhrasesIcon className="fill-current" aria-hidden="true" />
          {formattedReplyCount}
        </Link>
      )}
      {metrics.retweet_count !== undefined && (
        <Link
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-mono text-muted-foreground hover:underline"
          onClick={(e) => e.stopPropagation()}
          aria-label={`View retweets and quotes (${formattedRepeatSum})`}
        >
          <RepeatIcon className="fill-current" aria-hidden="true" />
          {formattedRepeatSum}
        </Link>
      )}
      {metrics.favorite_count !== undefined && (
        <Link
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-mono text-muted-foreground hover:underline"
          onClick={(e) => e.stopPropagation()}
          aria-label={`View likes (${formattedFavoriteCount})`}
        >
          <FavoriteIcon className="fill-current" aria-hidden="true" />
          {formattedFavoriteCount}
        </Link>
      )}

      {metrics.views_count !== undefined && (
        <Link
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-mono text-muted-foreground hover:underline"
          onClick={(e) => e.stopPropagation()}
          aria-label={`View impressions (${formattedViewsCount})`}
        >
          <InsertChartIcon className="fill-current" aria-hidden="true" />
          {formattedViewsCount}
        </Link>
      )}
    </footer>
  );
}
