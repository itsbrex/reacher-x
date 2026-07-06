type ThreadHistoryLinkLike = {
  _creationTime: number;
  threadId: string;
};

/**
 * Keep the newest relationship row per thread so duplicate link rows do not
 * surface as duplicate history entries in the UI.
 */
export function dedupeThreadHistoryLinksByThreadId<
  T extends ThreadHistoryLinkLike,
>(links: T[]): T[] {
  const latestLinkByThreadId = new Map<string, T>();

  for (const link of links) {
    const existingLink = latestLinkByThreadId.get(link.threadId);
    if (!existingLink || link._creationTime > existingLink._creationTime) {
      latestLinkByThreadId.set(link.threadId, link);
    }
  }

  return Array.from(latestLinkByThreadId.values()).sort(
    (left, right) => right._creationTime - left._creationTime
  );
}
