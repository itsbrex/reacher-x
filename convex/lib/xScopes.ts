export const X_CORE_SCOPES = [
  "tweet.read",
  "users.read",
  "tweet.write",
  "media.write",
  "like.read",
  "like.write",
  "bookmark.read",
  "bookmark.write",
  "follows.read",
  "follows.write",
  "dm.read",
  "dm.write",
  "offline.access",
] as const;

export type XScope = (typeof X_CORE_SCOPES)[number];
