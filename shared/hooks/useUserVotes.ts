"use client";

import { useMemo } from "react";
import { useUnifiedKeywords } from "./useUnifiedKeywords";

type VoteType = "up" | "down";

interface GetVoteOptions {
  keywordId?: string;
}

/**
 * Aggregates the user's tweet votes from the canonical keyword source.
 * - Authenticated: derives from Convex keywords via `useUnifiedKeywords()`
 * - Unauthenticated: derives from localStorage keywords via `useUnifiedKeywords()`
 *
 * Exposes helpers to query by tweetId and optionally scope by keywordId.
 */
export function useUserVotes() {
  const { keywords, isLoaded, dataSource } = useUnifiedKeywords();

  // Build a map of the latest vote per tweet across all keywords
  const votesByTweet: Record<string, VoteType> = useMemo(() => {
    if (!isLoaded || !keywords?.length) return {};

    const latestByTweet: Record<string, { vote: VoteType; ts: number }> = {};

    for (const kw of keywords) {
      if (!kw?.votes?.length) continue;
      for (const v of kw.votes) {
        if (!v.tweetId) continue;
        const prev = latestByTweet[v.tweetId];
        if (!prev || v.timestamp > prev.ts) {
          latestByTweet[v.tweetId] = { vote: v.vote, ts: v.timestamp };
        }
      }
    }

    const result: Record<string, VoteType> = {};
    for (const [tweetId, data] of Object.entries(latestByTweet)) {
      result[tweetId] = data.vote;
    }
    return result;
  }, [isLoaded, keywords]);

  // Build a map of latest vote per tweet scoped by keywordId
  const votesByKeywordAndTweet: Record<
    string,
    Record<string, VoteType>
  > = useMemo(() => {
    if (!isLoaded || !keywords?.length) return {};

    const map: Record<
      string,
      Record<string, { vote: VoteType; ts: number }>
    > = {};
    for (const kw of keywords) {
      const kwId = kw.id as string;
      if (!kw?.votes?.length || !kwId) continue;
      if (!map[kwId]) map[kwId] = {};

      for (const v of kw.votes) {
        if (!v.tweetId) continue;
        const prev = map[kwId][v.tweetId];
        if (!prev || v.timestamp > prev.ts) {
          map[kwId][v.tweetId] = { vote: v.vote, ts: v.timestamp };
        }
      }
    }

    const result: Record<string, Record<string, VoteType>> = {};
    for (const [kwId, perTweet] of Object.entries(map)) {
      result[kwId] = {};
      for (const [tweetId, data] of Object.entries(perTweet)) {
        result[kwId][tweetId] = data.vote;
      }
    }
    return result;
  }, [isLoaded, keywords]);

  const getVote = (tweetId: string, opts?: GetVoteOptions): VoteType | null => {
    if (!tweetId) return null;
    if (opts?.keywordId) {
      const byKw = votesByKeywordAndTweet[opts.keywordId];
      if (byKw && tweetId in byKw) return byKw[tweetId];
      return null;
    }
    return votesByTweet[tweetId] || null;
  };

  const isUpvoted = (tweetId: string, opts?: GetVoteOptions): boolean => {
    return getVote(tweetId, opts) === "up";
  };

  const isDownvoted = (tweetId: string, opts?: GetVoteOptions): boolean => {
    return getVote(tweetId, opts) === "down";
  };

  return {
    votesByTweet,
    getVote,
    isUpvoted,
    isDownvoted,
    dataSource, // "convex" | "localStorage"
    isLoaded,
  };
}
