import { action } from "./_generated/server";
import { rePromptKeywordsArgsValidator } from "./validators";
import { generateObject } from "ai";
import { z } from "zod";
import { createLLMModel } from "./lib/llmConfig";
import { logger } from "../shared/lib/logger";

// =============================================================================
// KEYWORD RE-PROMPT SYSTEM
// =============================================================================
/**
 * This action implements dynamic keyword re-prompting based on performance feedback.
 * When keywords cross performance thresholds, it generates improved suggestions.
 *
 * Key features:
 * - Analyzes keyword performance patterns
 * - Generates improved keyword suggestions based on successful/failed keywords
 * - Maintains context about user preferences through voting patterns
 * - Prevents keyword stagnation and improves over time
 *
 * References:
 * - Reinforcement Learning from Human Feedback (RLHF)
 * - Active Learning principles for keyword optimization
 * - Netflix's approach to content recommendation improvement
 */

import { validateDescriptionForKeywords } from "../shared/lib/utils/validation";
import { generateRequestId } from "../shared/lib/utils/request";
import { createPromptSection } from "../shared/lib/utils/prompt";

// Configuration constants for re-prompt
const KEYWORD_REPROMPT_CONFIG = {
  TARGET_KEYWORD_COUNT: 15,
} as const;

// Simplified schema for re-prompt results (MVP)
const KeywordRePromptSchema = z
  .object({
    improvedKeywords: z
      .array(
        z.object({
          keyword: z
            .string()
            .min(1)
            .max(100)
            .describe("Improved keyword based on performance analysis"),
          exactMatch: z.boolean().describe("Whether to search as exact phrase"),
        })
      )
      .length(KEYWORD_REPROMPT_CONFIG.TARGET_KEYWORD_COUNT)
      .describe(
        `Array of ${KEYWORD_REPROMPT_CONFIG.TARGET_KEYWORD_COUNT} improved keywords`
      ),

    analysisInsights: z
      .object({
        highPerformingPatterns: z.array(z.string()),
        lowPerformingPatterns: z.array(z.string()),
        recommendedAdjustments: z.array(z.string()),
      })
      .describe("Analysis insights from keyword performance"),
  })
  .describe("Keyword re-prompt results with performance-based improvements");

export const rePromptKeywords = action({
  args: rePromptKeywordsArgsValidator,
  handler: async (ctx, { userDescription, flaggedKeywords }) => {
    const startTime = Date.now();
    const requestId = generateRequestId("keyword_reprompt");

    logger.info(`[KEYWORD_REPROMPT] Starting request ${requestId}`, {
      userDescription: userDescription.substring(0, 100) + "...",
      flaggedKeywordsCount: flaggedKeywords.length,
      timestamp: new Date().toISOString(),
    });

    try {
      // Validate user description
      const descriptionValidation =
        validateDescriptionForKeywords(userDescription);
      if (!descriptionValidation.isValid) {
        logger.error(
          `[KEYWORD_REPROMPT] ${requestId} - Description validation failed:`,
          {
            error: descriptionValidation.error,
          }
        );
        throw new Error(`Invalid description: ${descriptionValidation.error}`);
      }

      if (flaggedKeywords.length === 0) {
        logger.info(
          `[KEYWORD_REPROMPT] ${requestId} - No flagged keywords to process`
        );
        return {
          success: false,
          error: "No flagged keywords provided for re-prompting",
          data: null,
        };
      }

      // Analyze keyword performance patterns
      const highPerformingKeywords = flaggedKeywords.filter(
        (k) => k.status === "high_value"
      );
      const lowPerformingKeywords = flaggedKeywords.filter(
        (k) => k.status === "discarded"
      );

      logger.info(
        `[KEYWORD_REPROMPT] ${requestId} - Analyzing keyword performance:`,
        {
          highPerformingCount: highPerformingKeywords.length,
          lowPerformingCount: lowPerformingKeywords.length,
        }
      );

      // Enhanced prompt for performance-based keyword improvement
      const prompt = `You are an expert keyword optimization AI agent for ReacherX, tasked with improving keyword suggestions based on user voting performance data. Build on the core expertise of crafting creative, emotionally resonant queries that surface genuine buyer intent on Twitter/X—using personal, human language (e.g., frustration like 'I suck at', humor like 'lol this sucks') to filter out promotional noise.

${createPromptSection("Description provided by user:", userDescription)}

PERFORMANCE ANALYSIS:

High-Performing Keywords (Users voted 👍 - these are working well):
${
  highPerformingKeywords.length > 0
    ? highPerformingKeywords
        .map(
          (k) =>
            `- "${k.keyword}" (Score: ${k.decayedScore.toFixed(2)}, Votes: ${k.upVotes}👍/${k.downVotes}👎)`
        )
        .join("\n")
    : "- None identified yet"
}

Low-Performing Keywords (Users voted 👎 - these need improvement):
${
  lowPerformingKeywords.length > 0
    ? lowPerformingKeywords
        .map(
          (k) =>
            `- "${k.keyword}" (Score: ${k.decayedScore.toFixed(2)}, Votes: ${k.upVotes}👍/${k.downVotes}👎)`
        )
        .join("\n")
    : "- None identified yet"
}

TASK: Generate exactly ${KEYWORD_REPROMPT_CONFIG.TARGET_KEYWORD_COUNT} IMPROVED keywords as creative evolutions based on this performance feedback and the user's description. These will replace or augment existing ones, shown in batches of 5, so ensure diversity in emotional tone, phrasing, and specificity. Each must tie directly to pains/features from the user description and use organic buyer language (2-4 words max). Mentally simulate searching each on Twitter/X: Only include if it likely yields 70%+ buyer-intent results (personal vents/questions) over promotions.

ANALYSIS STRATEGY:
1. If high-performing keywords exist: Identify what makes them successful (word choices, intent types, specificity levels) and create similar variations
2. If low-performing keywords exist: Understand what didn't work (too generic, wrong intent, poor targeting) and avoid these patterns
3. Look for gaps in intent coverage and user preference patterns

IMPROVEMENT PRINCIPLES:
- Learn from successful patterns in high-performing keywords
- Avoid characteristics that led to low performance
- Increase specificity if generic keywords performed poorly
- Adjust emotional language based on what resonated with users
- Optimize intent targeting based on performance data
- Consider user behavior patterns revealed through voting

Output ONLY valid JSON matching the schema (no additional text):

{
  "improvedKeywords": [
    {
      "keyword": "string",
      "exactMatch": true
    }
  ],
  "analysisInsights": {
    "highPerformingPatterns": ["e.g., emotional self-deprecation drove upvotes like 'I suck at...'"] ,
    "lowPerformingPatterns": ["e.g., generic terms attracted seller noise; lacked personal touch"],
    "recommendedAdjustments": ["e.g., Add 50% more 'I/my' phrasing for relatability", "Inject humor in 20% of future keywords", "Tie every keyword to specific user description pains like [example from description]"]
  }
}`;

      // Get the model configuration
      const modelConfig = createLLMModel("keyword_generation");

      logger.info(
        `[KEYWORD_REPROMPT] ${requestId} - Calling LLM for keyword re-prompting:`,
        {
          promptLength: prompt.length,
          model: modelConfig.modelName,
          temperature: modelConfig.temperature,
        }
      );

      // Call LLM with structured output
      const llmStartTime = Date.now();
      const result = await generateObject({
        model: modelConfig.model,
        schema: KeywordRePromptSchema,
        prompt: prompt,
        temperature: modelConfig.temperature,
      });
      const llmEndTime = Date.now();

      logger.info(`[KEYWORD_REPROMPT] ${requestId} - LLM call completed:`, {
        processingTimeMs: llmEndTime - llmStartTime,
        keywordCount: result.object?.improvedKeywords?.length || 0,
        usage: result.usage,
      });

      // Validate LLM response
      if (
        !result.object?.improvedKeywords ||
        !Array.isArray(result.object.improvedKeywords)
      ) {
        logger.error(
          `[KEYWORD_REPROMPT] ${requestId} - Invalid LLM response format:`,
          {
            response: result.object,
          }
        );
        throw new Error("LLM returned invalid response format");
      }

      const keywords = result.object.improvedKeywords;
      const insights = result.object.analysisInsights;

      // Log insights for debugging
      logger.info(`[KEYWORD_REPROMPT] ${requestId} - Generated insights:`, {
        highPerformingPatterns: insights.highPerformingPatterns,
        lowPerformingPatterns: insights.lowPerformingPatterns,
        recommendedAdjustments: insights.recommendedAdjustments,
      });

      // Transform to frontend-compatible format (core fields only)
      const improvedKeywords = keywords.map((kw, index) => ({
        id: `reprompt_${requestId}_${index}`,
        keyword: kw.keyword,
        timestamp: new Date().toISOString(),
        metadata: {
          generatedAt: Date.now(),
          source: `${modelConfig.modelName}_reprompt`,
          isRePrompt: true,
          basedOnPerformance: true,
          exactMatch: kw.exactMatch,
        },
      }));

      const endTime = Date.now();
      logger.info(
        `[KEYWORD_REPROMPT] ${requestId} - Request completed successfully:`,
        {
          totalProcessingTimeMs: endTime - startTime,
          llmProcessingTimeMs: llmEndTime - llmStartTime,
          finalKeywordCount: improvedKeywords.length,
        }
      );

      return {
        success: true,
        data: {
          improvedKeywords,
          insights,
          metadata: {
            requestId,
            generatedAt: Date.now(),
            processingTimeMs: endTime - startTime,
            llmProcessingTimeMs: llmEndTime - llmStartTime,
            basedOnKeywords: flaggedKeywords.map((k) => k.keyword),
            performanceContext: {
              highPerformingCount: highPerformingKeywords.length,
              lowPerformingCount: lowPerformingKeywords.length,
            },
          },
        },
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error(`[KEYWORD_REPROMPT] ${requestId} - Request failed:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: endTime - startTime,
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Keyword re-prompting failed",
        data: null,
        metadata: {
          requestId,
          processingTimeMs: endTime - startTime,
        },
      };
    }
  },
});
