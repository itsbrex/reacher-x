import { ConvexHttpClient } from "convex/browser";
import { connection } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Thread } from "@/features/threads/types";
import { logger } from "@/shared/lib/logger";

type PublicThreadResponse = {
  thread: Thread | null;
  threadNumber: number | null;
  totalThreads: number;
};

function createConvexHttpClient() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "", {
    logger: false,
  });
}

export async function getPublicThreads(options?: {
  limit?: number;
  excludeThreadId?: string;
}) {
  await connection();

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return [];
  }

  const convex = createConvexHttpClient();
  try {
    const response = await convex.action(api.publicSocial.getPublicThreads, {
      excludeThreadId: options?.excludeThreadId,
      limit: options?.limit,
    });
    return response.threads as Thread[];
  } catch (error) {
    logger.error("[getPublicThreads] Failed to fetch public threads", error);
    return [];
  }
}

export async function getPublicThread(threadId: string) {
  await connection();

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return {
      thread: null,
      threadNumber: null,
      totalThreads: 0,
    } satisfies PublicThreadResponse;
  }

  const convex = createConvexHttpClient();
  try {
    return (await convex.action(api.publicSocial.getPublicThread, {
      threadId,
    })) as PublicThreadResponse;
  } catch (error) {
    logger.error("[getPublicThread] Failed to fetch public thread", error);
    return {
      thread: null,
      threadNumber: null,
      totalThreads: 0,
    } satisfies PublicThreadResponse;
  }
}
