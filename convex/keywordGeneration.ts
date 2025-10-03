// convex/keywordGeneration.ts
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateObject } from "ai";
import { z } from "zod";
import { createLLMModel } from "./lib/llmConfig";
import { logger } from "../shared/lib/logger";
import { validateDescriptionForKeywords } from "../shared/lib/utils/validation";
import { generateRequestId } from "../shared/lib/utils/request";

/**
 * SEED KEYWORD GENERATION
 *
 * Generates a single high-quality keyword for immediate search
 * This is optimized for speed - generates just 1 keyword instead of 15
 */

const SeedKeywordSchema = z
  .object({
    keyword: z
      .string()
      .min(1)
      .max(100)
      .describe("A single high-quality buyer-intent keyword"),
    exactMatch: z
      .boolean()
      .describe(
        "Whether this keyword should be searched as an exact phrase match"
      ),
  })
  .describe("Single seed keyword for immediate search");

export const generateSeedKeyword = action({
  args: {
    userDescription: v.string(),
  },
  handler: async (ctx, { userDescription }) => {
    const startTime = Date.now();
    const requestId = generateRequestId("seed_keyword");

    logger.info(`[SEED_KEYWORD] Starting request ${requestId}`, {
      descriptionLength: userDescription.length,
      timestamp: new Date().toISOString(),
    });

    try {
      // Validate user description
      const descriptionValidation =
        validateDescriptionForKeywords(userDescription);
      if (!descriptionValidation.isValid) {
        logger.error(
          `[SEED_KEYWORD] ${requestId} - Description validation failed:`,
          {
            error: descriptionValidation.error,
          }
        );
        throw new Error(`Invalid description: ${descriptionValidation.error}`);
      }

      // Updated prompt for single seed keyword generation
      const prompt = `You are an expert potential customer finding AI agent for ReacherX, a platform that helps anyone find potential customers on social media. Your expertise lies in crafting inventive, emotionally resonant search queries that surface genuine buyer intent on Twitter/X, using creative language to mimic real people's frustrations, humor, and vulnerabilities—while filtering out promotional noise from sellers, affiliates, and spammers.

The following is the description that the user has provided:
"${userDescription}"

Your task: Generate exactly ONE creative, precise search query (a keyword/phrase) to discover potential customers actively expressing buying needs for the described product/service/skill. Focus on organic, personal language that reveals unmet needs through emotions like frustration, self-doubt, or light humor (e.g., "I suck at [pain point]", "lol this [issue] sucks"). The query should minimize seller hijacks by sounding like an everyday user vent. Mentally simulate searching on Twitter/X: Only include if it likely yields 70%+ buyer-intent results (e.g., personal stories/questions) over promotions.

Guidelines to Avoid Hijacked Keywords:
1. Keep concise: 2-3 words max (for platform limits), blending specificity from user description with creative flair.
2. Buyer-oriented modifiers: Use words like 'help me', 'stuck on', 'recommend something', but make them personal/emotional.
3. Natural exclusions: Imply individual struggles (e.g., 'my [pain] is embarrassing' to avoid commercial pitches).
4. Blend formal/industry terms with slang, typos, abbreviations, and creative twists (e.g., 'lead managment fail' or 'CRM nightmare vibes').
5. Prioritize low-competition signals: Target small user vibes (individuals/teams), not marketer lingo.
8. Creativity Mandate: Infuse personal touch—use first-person ("I", "my team"), emojis in phrasing if natural (e.g., "suck at customer tracking"), or casual exclamations to evoke relatability.

For the query, provide:
- The exact keyword/phrase to search for (Do not add quotes).
- exactMatch: boolean (true for precise emotional phrases/questions to catch exact vents; false for broader emotional themes).

Output ONLY valid JSON (no additional text):
{
  "keyword": "string",
  "exactMatch": true or false
}`;

      // Get model config - use a dedicated fast path for seed generation
      const modelConfig = createLLMModel("seed_generation");

      logger.info(`[SEED_KEYWORD] ${requestId} - Calling LLM:`, {
        model: modelConfig.modelName,
        temperature: modelConfig.temperature,
      });

      // Call LLM
      const llmStartTime = Date.now();
      const result = await generateObject({
        model: modelConfig.model,
        schema: SeedKeywordSchema,
        prompt: prompt,
        temperature: modelConfig.temperature,
      });
      const llmEndTime = Date.now();

      logger.info(`[SEED_KEYWORD] ${requestId} - LLM call completed:`, {
        processingTimeMs: llmEndTime - llmStartTime,
        keyword: result.object.keyword,
        exactMatch: result.object.exactMatch,
      });

      // Validate response
      if (!result.object?.keyword) {
        throw new Error("LLM returned invalid response - missing keyword");
      }

      const endTime = Date.now();
      logger.info(`[SEED_KEYWORD] ${requestId} - Completed successfully:`, {
        totalTimeMs: endTime - startTime,
        keyword: result.object.keyword,
        exactMatch: result.object.exactMatch,
      });

      return {
        success: true,
        data: {
          keyword: result.object.keyword,
          exactMatch: result.object.exactMatch,
          metadata: {
            requestId,
            generatedAt: Date.now(),
            processingTimeMs: endTime - startTime,
            modelUsed: modelConfig.modelName,
          },
        },
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error(`[SEED_KEYWORD] ${requestId} - Failed:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        processingTimeMs: endTime - startTime,
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Seed keyword generation failed",
        data: null,
      };
    }
  },
});
