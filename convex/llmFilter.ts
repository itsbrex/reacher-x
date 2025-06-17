// convex/llmFilter.ts
import { v } from "convex/values";
import { action } from "./_generated/server";

interface Tweet {
  id: string;
  text: string;
  author?: {
    name?: string;
    username?: string;
  };
}

export const filterTweetsWithLLM = action({
  args: {
    tweets: v.any(),
    originalQuery: v.string(),
    userDescription: v.optional(v.string()),
  },
  handler: async (ctx, { tweets, originalQuery, userDescription }) => {
    try {
      // Use Vercel AI SDK for LLM filtering
      const { generateObject } = await import("ai");
      const { openai } = await import("@ai-sdk/openai");
      const { z } = await import("zod");

      if (!tweets?.tweets || !Array.isArray(tweets.tweets)) {
        throw new Error("Invalid tweets data structure");
      }

      // Define the schema for filtered results - simplified
      const FilteredTweetsSchema = z.object({
        filteredTweets: z.array(
          z.object({
            id: z.string(),
            keep: z.boolean(),
            reason: z.string(),
          })
        ),
        summary: z.string(),
      });

      // Prepare tweets for LLM analysis (first 20 to manage token limits)
      const tweetsForAnalysis = tweets.tweets
        .slice(0, 20)
        .map((tweet: Tweet) => ({
          id: tweet.id,
          text: tweet.text,
          author: tweet.author?.name || tweet.author?.username,
          username: tweet.author?.username,
        }));

      const systemPrompt = `You are an expert at identifying potential customers from social media posts. 
      Filter tweets that represent genuine potential customers or leads, NOT promotional content or spam.
      
      KEEP tweets that show:
      - People expressing problems, frustrations, or needs
      - Questions seeking help or recommendations  
      - Complaints about current solutions
      - People stating they're looking for something
      - Genuine pain points or challenges
      
      FILTER OUT tweets that are:
      - Promotional content or ads
      - Self-promotional posts
      - Bot or spam content
      - Generic statements without clear intent
      - News or informational content without personal need
      - Memes or jokes without genuine need`;

      const userPrompt = `
Search query: "${originalQuery}"
${userDescription ? `Business context: ${userDescription}` : ""}

Analyze these tweets and identify which ones represent potential customers:

${JSON.stringify(tweetsForAnalysis, null, 2)}`;

      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: FilteredTweetsSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.3,
      });

      // Filter original tweets based on LLM decision
      const keptTweetIds = new Set(
        result.object.filteredTweets.filter((t) => t.keep).map((t) => t.id)
      );

      const filteredResults = {
        ...tweets,
        tweets: tweets.tweets.filter((tweet: Tweet) =>
          keptTweetIds.has(tweet.id)
        ),
        meta: {
          ...tweets.meta,
          originalCount: tweets.tweets.length,
          filteredCount: keptTweetIds.size,
          filterSummary: result.object.summary,
        },
      };

      return {
        success: true,
        data: filteredResults,
      };
    } catch (error) {
      console.error("LLM filtering error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Filtering failed",
        data: tweets, // Return original tweets if filtering fails
      };
    }
  },
});
