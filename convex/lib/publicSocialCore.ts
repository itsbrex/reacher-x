import type { Tweet, Thread } from "../../features/threads/types";
import { logger } from "../../shared/lib/logger";
import {
  getCurrentUTCTimestamp,
  parseIsoToTimestamp,
} from "../../shared/lib/utils/time/timeUtils";
import { acquireSocialApiBudget } from "./socialApiBudget";
import { mapSocialApiTweet } from "./socialApiTwitterMap";

const SOCIALAPI_BASE_URL = "https://api.socialapi.me";

const publicSocialLogger = logger.withScope("publicSocial");

class SocialApiRequestError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type OrderedConfigRow = {
  position: number;
  isActive: boolean;
  threadId?: string;
  tweetId?: string;
};

export type NormalizedOrderedConfigEntry = {
  id: string;
  position: number;
};

function parseSocialApiErrorMessage(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as { message?: string };
    return typeof parsed.message === "string" ? parsed.message : undefined;
  } catch {
    return undefined;
  }
}

function isSocialApiNotFoundError(error: unknown): boolean {
  if (!(error instanceof SocialApiRequestError)) {
    return false;
  }
  if (error.status === 404) {
    return true;
  }
  const message = parseSocialApiErrorMessage(error.body)?.toLowerCase() ?? "";
  return message.includes("not found");
}

export async function fetchSocialApiJson(
  ctx: any,
  consumer: string,
  path: string,
  params?: URLSearchParams
) {
  const apiKey = process.env.SOCIALAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SOCIALAPI_API_KEY is not set");
  }

  await acquireSocialApiBudget(ctx, consumer);
  const url = `${SOCIALAPI_BASE_URL}${path}${params ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    const detail =
      parseSocialApiErrorMessage(body) ??
      `${response.status} ${response.statusText}`.trim();
    throw new SocialApiRequestError(
      response.status,
      body,
      `SocialAPI request failed: ${detail}`
    );
  }

  return await response.json();
}

export async function postSocialApiJson(
  ctx: any,
  consumer: string,
  path: string,
  body: Record<string, unknown>
) {
  const apiKey = process.env.SOCIALAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SOCIALAPI_API_KEY is not set");
  }

  await acquireSocialApiBudget(ctx, consumer);
  const url = `${SOCIALAPI_BASE_URL}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const rawBody = await response.text();
    const detail =
      parseSocialApiErrorMessage(rawBody) ??
      `${response.status} ${response.statusText}`.trim();
    throw new SocialApiRequestError(
      response.status,
      rawBody,
      `SocialAPI request failed: ${detail}`
    );
  }

  return await response.json();
}

export function normalizeOrderedConfigEntries<
  T extends OrderedConfigRow,
  K extends "threadId" | "tweetId",
>(
  rows: T[],
  key: K,
  options?: {
    includeInactive?: boolean;
    limit?: number;
    excludeId?: string;
  }
): NormalizedOrderedConfigEntry[] {
  const includeInactive = options?.includeInactive ?? false;
  const excludeId = options?.excludeId?.trim();
  const deduped = new Set<string>();
  const normalizedEntries: NormalizedOrderedConfigEntry[] = [];

  const sortedRows = [...rows].sort(
    (left, right) => left.position - right.position
  );
  for (const row of sortedRows) {
    if (!includeInactive && row.isActive !== true) {
      continue;
    }
    const rawValue = row[key];
    const id = typeof rawValue === "string" ? rawValue.trim() : "";
    if (!id || id === excludeId || deduped.has(id)) {
      continue;
    }
    deduped.add(id);
    normalizedEntries.push({ id, position: row.position });
    if (
      typeof options?.limit === "number" &&
      normalizedEntries.length >= options.limit
    ) {
      break;
    }
  }

  return normalizedEntries;
}

export function normalizeOrderedConfigIds<
  T extends OrderedConfigRow,
  K extends "threadId" | "tweetId",
>(
  rows: T[],
  key: K,
  options?: {
    includeInactive?: boolean;
    limit?: number;
    excludeId?: string;
  }
): string[] {
  return normalizeOrderedConfigEntries(rows, key, options).map(
    (entry) => entry.id
  );
}

function mapTweetsFromThreadPayload(rawTweets: unknown[]): Tweet[] {
  return rawTweets
    .map((tweet) => mapSocialApiTweet(tweet))
    .filter((tweet): tweet is NonNullable<typeof tweet> => tweet !== null);
}

function getTweetTimestamp(tweet?: Tweet): number {
  if (!tweet) {
    return getCurrentUTCTimestamp();
  }

  const parsed = tweet.tweet_created_at
    ? parseIsoToTimestamp(tweet.tweet_created_at)
    : undefined;
  if (typeof parsed === "number") {
    return parsed;
  }

  const numericId = Number(tweet.id_str);
  return Number.isFinite(numericId) ? numericId : getCurrentUTCTimestamp();
}

export async function fetchPublicTweetsByIds(
  ctx: any,
  tweetIds: string[]
): Promise<Tweet[]> {
  const normalizedIds = [
    ...new Set(tweetIds.map((tweetId) => tweetId.trim()).filter(Boolean)),
  ].slice(0, 100);
  if (normalizedIds.length === 0) {
    return [];
  }

  try {
    const responsePayload = (await postSocialApiJson(
      ctx,
      "publicSocial.fetchPublicTweetsByIds",
      "/twitter/tweets-by-ids",
      {
        ids: normalizedIds,
      }
    )) as
      | {
          tweets?: unknown[];
        }
      | unknown[];

    const rawTweets = Array.isArray(responsePayload)
      ? responsePayload
      : Array.isArray(responsePayload.tweets)
        ? responsePayload.tweets
        : [];

    const mappedTweets = mapTweetsFromThreadPayload(rawTweets);
    const tweetsById = new Map(
      mappedTweets.map((tweet) => [tweet.id_str, tweet] as const)
    );

    return normalizedIds.flatMap((tweetId) => {
      const tweet = tweetsById.get(tweetId);
      return tweet ? [tweet] : [];
    });
  } catch (error) {
    if (!isSocialApiNotFoundError(error)) {
      publicSocialLogger.warn(
        "[publicSocial] Failed to fetch testimonial tweets",
        {
          tweetIds: normalizedIds,
          error,
        }
      );
    }
    return [];
  }
}

export async function fetchPublicThreadById(
  ctx: any,
  threadId: string
): Promise<Thread | null> {
  try {
    const threadData = (await fetchSocialApiJson(
      ctx,
      "publicSocial.fetchPublicThreadById",
      `/twitter/thread/${threadId}`
    )) as {
      tweets?: unknown[];
    };

    const tweets = Array.isArray(threadData.tweets)
      ? mapTweetsFromThreadPayload(threadData.tweets)
      : [];

    if (tweets.length === 0) {
      return null;
    }

    return {
      threadId,
      postedAt: getTweetTimestamp(tweets[0]),
      tweets,
    };
  } catch (error) {
    if (!isSocialApiNotFoundError(error)) {
      publicSocialLogger.warn("[publicSocial] Failed to fetch public thread", {
        threadId,
        error,
      });
    }
    return null;
  }
}
