// convex/twitterSearch.ts
import { v } from "convex/values";
import { action } from "./_generated/server";
import type { Tweet, Entities } from "../features/threads/types";

// Constants for API configuration
const TWITTER_API_BASE_URL =
  "https://api.twitterapi.io/twitter/tweet/advanced_search";
const MAX_QUERY_LENGTH = 500;
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Twitter API response types
interface TwitterApiUser {
  type: string;
  userName: string;
  url: string;
  twitterUrl: string;
  id: string;
  name: string;
  isVerified: boolean;
  isBlueVerified: boolean;
  verifiedType: string | null;
  profilePicture: string;
  coverPicture: string;
  description: string;
  location: string;
  followers: number;
  following: number;
  status: string;
  canDm: boolean;
  canMediaTag: boolean;
  createdAt: string;
  entities: {
    description: unknown;
    url: unknown;
  };
  fastFollowersCount: number;
  favouritesCount: number;
  hasCustomTimelines: boolean;
  isTranslator: boolean;
  mediaCount: number;
  statusesCount: number;
  withheldInCountries: string[];
  affiliatesHighlightedLabel: Record<string, unknown>;
  possiblySensitive: boolean;
  pinnedTweetIds: string[];
  profile_bio: {
    description: string;
    entities: unknown;
  };
  isAutomated: boolean;
  automatedBy: unknown;
}

interface TwitterApiTweet {
  type: string;
  id: string;
  url: string;
  twitterUrl: string;
  text: string;
  source: string;
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  viewCount: number;
  createdAt: string;
  lang: string;
  bookmarkCount: number;
  isReply: boolean;
  inReplyToId: string;
  conversationId: string;
  inReplyToUserId: string;
  inReplyToUsername: string;
  author: TwitterApiUser;
  extendedEntities: Record<string, unknown>;
  card: unknown;
  place: Record<string, unknown>;
  entities: Entities;
  quoted_tweet: TwitterApiTweet | null;
  retweeted_tweet: TwitterApiTweet | null;
}

interface TwitterApiResponse {
  tweets: TwitterApiTweet[];
  has_next_page: boolean;
  next_cursor: string;
}

// Utility function to convert camelCase to snake_case
function toSnakeCase(str: string): string {
  return str
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    .replace(/^_/, ""); // Remove leading underscore if present
}

// Utility function to recursively convert object keys to snake_case
function convertToSnakeCase<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(convertToSnakeCase) as T;
  }

  if (obj !== null && typeof obj === "object") {
    return Object.entries(obj).reduce(
      (acc, [key, value]) => {
        const snakeKey = toSnakeCase(key);
        acc[snakeKey] = convertToSnakeCase(value);
        return acc;
      },
      {} as Record<string, unknown>
    ) as T;
  }

  return obj;
}

// Transform Twitter API response to match our expected format
function transformTwitterResponse(response: TwitterApiResponse): {
  tweets: Tweet[];
  has_next_page: boolean;
  next_cursor: string;
} {
  if (!response?.tweets) {
    return {
      tweets: [],
      has_next_page: false,
      next_cursor: "",
    };
  }

  const transformedTweets = response.tweets.map(
    (tweet): Tweet => ({
      id: parseInt(tweet.id, 10),
      id_str: tweet.id,
      text: tweet.text,
      full_text: tweet.text,
      tweet_created_at: tweet.createdAt,
      source: tweet.source,
      retweet_count: tweet.retweetCount,
      reply_count: tweet.replyCount,
      favorite_count: tweet.likeCount,
      quote_count: tweet.quoteCount,
      views_count: tweet.viewCount,
      lang: tweet.lang,
      bookmark_count: tweet.bookmarkCount,
      in_reply_to_status_id_str: tweet.inReplyToId,
      conversation_id_str: tweet.conversationId,
      in_reply_to_user_id_str: tweet.inReplyToUserId,
      in_reply_to_screen_name: tweet.inReplyToUsername,
      user: tweet.author
        ? {
            id: parseInt(tweet.author.id, 10),
            id_str: tweet.author.id,
            name: tweet.author.name,
            screen_name: tweet.author.userName,
            verified: tweet.author.isVerified,
            profile_image_url_https: tweet.author.profilePicture,
            protected: false,
            followers_count: tweet.author.followers,
            friends_count: tweet.author.following,
            listed_count: 0,
            favourites_count: tweet.author.favouritesCount,
            statuses_count: tweet.author.statusesCount,
            created_at: tweet.author.createdAt,
            can_dm: tweet.author.canDm,
          }
        : undefined,
      entities: tweet.entities || {},
      quoted_status: tweet.quoted_tweet
        ? {
            ...convertToSnakeCase(tweet.quoted_tweet),
            id: parseInt(tweet.quoted_tweet.id, 10),
          }
        : undefined,
      retweeted_status: tweet.retweeted_tweet
        ? {
            ...convertToSnakeCase(tweet.retweeted_tweet),
            id: parseInt(tweet.retweeted_tweet.id, 10),
          }
        : undefined,
    })
  );

  return {
    tweets: transformedTweets,
    has_next_page: response.has_next_page,
    next_cursor: response.next_cursor,
  };
}

export const searchTwitter = action({
  args: {
    query: v.string(),
    exactMatch: v.boolean(),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { query, exactMatch, cursor }) => {
    try {
      // Validate query length
      if (query.length > MAX_QUERY_LENGTH) {
        throw new Error(
          `Query too long. Maximum ${MAX_QUERY_LENGTH} characters allowed.`
        );
      }

      // Get and validate API key
      const twitterApiKey = process.env.TWITTER_API_KEY;
      if (!twitterApiKey) {
        throw new Error(
          "Twitter API key not configured. Please set TWITTER_API_KEY in your Convex environment variables."
        );
      }

      // Format query for Twitter search
      let searchQuery = query.trim();
      if (exactMatch) {
        searchQuery = `"${searchQuery}"`;
      }

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        // Build URL with cursor if provided
        const url = new URL(TWITTER_API_BASE_URL);
        url.searchParams.set("queryType", "Latest");
        url.searchParams.set("query", searchQuery);
        if (cursor) {
          url.searchParams.set("cursor", cursor);
        }

        // Call Twitter API with proper error handling
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "X-API-Key": twitterApiKey,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Twitter API error: ${response.status} - ${errorData.message || response.statusText}`
          );
        }

        const results = (await response.json()) as TwitterApiResponse;
        const transformedResults = transformTwitterResponse(results);

        return {
          success: true,
          data: transformedResults,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error) {
          if (error.name === "AbortError") {
            throw new Error("Request timed out. Please try again.");
          }
          throw error;
        }
        throw new Error("An unexpected error occurred during the API call.");
      }
    } catch (error) {
      console.error("Twitter search error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Search failed",
      };
    }
  },
});
