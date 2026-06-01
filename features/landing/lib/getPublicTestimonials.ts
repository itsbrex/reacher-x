import { ConvexHttpClient } from "convex/browser";
import { connection } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Tweet } from "@/features/threads/types";
import { logger } from "@/shared/lib/logger";

export async function getPublicTestimonials(limit = 4) {
  await connection();

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return [];
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL, {
    logger: false,
  });

  try {
    const response = await convex.action(
      api.publicSocial.getPublicTestimonials,
      {
        limit,
      }
    );
    return response.tweets as Tweet[];
  } catch (error) {
    logger.error(
      "[getPublicTestimonials] Failed to fetch public testimonials",
      error
    );
    return [];
  }
}
