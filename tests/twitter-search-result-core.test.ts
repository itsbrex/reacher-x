import assert from "node:assert/strict";
import test from "node:test";
import {
  compactTwitterSearchPost,
  compactTwitterSearchResults,
  MAX_TWITTER_RETRIER_POSTS,
} from "../convex/lib/twitterSearchResultCore";

function buildRawTweet(id: number, depth = 0): Record<string, unknown> {
  const media = {
    id_str: `media_${id}`,
    media_url_https: `https://pbs.twimg.com/media/${id}.jpg`,
    type: "video",
    features: {
      large: { faces: Array.from({ length: 200 }, () => ({ x: 1 })) },
    },
    sizes: {
      large: { h: 1080, w: 1920, resize: "fit" },
    },
    original_info: {
      height: 1080,
      width: 1920,
      focus_rects: Array.from({ length: 20 }, () => ({
        x: 0,
        y: 0,
        w: 100,
        h: 100,
      })),
    },
    video_info: {
      aspect_ratio: [16, 9],
      duration_millis: 10_000,
      variants: Array.from({ length: 30 }, (_, index) => ({
        content_type: "video/mp4",
        url: `https://video.twimg.com/${id}/${index}.mp4`,
        bitrate: index * 100_000,
        oversized_provider_metadata: "x".repeat(10_000),
      })),
    },
  };
  const tweet: Record<string, unknown> = {
    tweet_created_at: "Sat Jul 12 12:00:00 +0000 2026",
    id: id,
    id_str: String(id),
    conversation_id_str: String(id),
    full_text: `Tweet ${id}`,
    user: {
      id,
      id_str: String(id),
      name: `User ${id}`,
      screen_name: `user_${id}`,
      created_at: "Sat Jul 12 12:00:00 +0000 2020",
      profile_image_url_https: `https://pbs.twimg.com/profile/${id}.jpg`,
      followers_count: 10,
      friends_count: 5,
      entities: {
        url: {
          urls: [
            {
              url: "https://t.co/site",
              expanded_url: "https://example.com",
              display_url: "example.com",
              indices: [0, 10],
            },
          ],
        },
      },
    },
    entities: { media: [media] },
  };

  if (depth < 5) {
    tweet.quoted_status = buildRawTweet(id + 1000, depth + 1);
  }

  return tweet;
}

test("Twitter retrier payloads preserve rendering fields while removing provider bulk", () => {
  const post = compactTwitterSearchPost(buildRawTweet(1));

  assert.ok(post);
  assert.equal(post.id_str, "1");
  assert.equal(post.full_text, "Tweet 1");
  assert.equal(post.user.screen_name, "user_1");
  assert.equal(
    (post.user.entities as { url: { urls: unknown[] } }).url.urls.length,
    1
  );
  assert.equal(post.entities?.media?.[0]?.features, undefined);
  assert.equal(post.entities?.media?.[0]?.video_info?.variants.length, 8);
  assert.equal(
    post.quoted_status?.quoted_status,
    undefined,
    "quoted tweets must be limited to one nested level"
  );
  assert.ok(JSON.stringify(post).length < 25_000);
});

test("Twitter retrier results enforce a hard per-query result bound", () => {
  const results = compactTwitterSearchResults(
    Array.from({ length: 50 }, (_, index) => buildRawTweet(index + 1))
  );

  assert.equal(results.length, MAX_TWITTER_RETRIER_POSTS);
  assert.deepEqual(compactTwitterSearchResults([buildRawTweet(1)], 0), []);
});
