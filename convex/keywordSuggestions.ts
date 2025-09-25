import { query, internalMutation, mutation } from "./_generated/server";
import {
  getSuggestionsArgsValidator,
  markSuggestionAsUsedArgsValidator,
  storeSuggestionsArgsValidator,
} from "./validators";

export const getSuggestions = query({
  args: getSuggestionsArgsValidator,
  handler: async (ctx, { workspaceId, limit }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const suggestions = await ctx.db
      .query("keywordSuggestions")
      .withIndex("by_workspace_isUsed_generatedAt", (q) =>
        q.eq("workspaceId", workspaceId).eq("isUsed", false)
      )
      .order("desc")
      .take(limit ?? 5);

    return suggestions;
  },
});

export const storeSuggestions = internalMutation({
  args: storeSuggestionsArgsValidator,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_user_id", (q) =>
        q.eq("workosUserId", identity.subject)
      )
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    for (let i = 0; i < args.suggestions.length; i++) {
      const s = args.suggestions[i];
      await ctx.db.insert("keywordSuggestions", {
        userId: user._id,
        workspaceId: args.workspaceId,
        keyword: s.keyword.trim().toLowerCase(),
        isUsed: false,
        generatedAt: s.generatedAt ?? now + i,
        userDescription: args.userDescription,
        batchRequestId: args.batchRequestId,
        metadata: s.metadata,
      });
    }
  },
});

export const markSuggestionAsUsed = mutation({
  args: markSuggestionAsUsedArgsValidator,
  handler: async (ctx, { suggestionId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_user_id", (q) =>
        q.eq("workosUserId", identity.subject)
      )
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const suggestion = await ctx.db.get(suggestionId);
    if (!suggestion || suggestion.userId !== user._id) {
      throw new Error("Suggestion not found or not authorized");
    }

    if (!suggestion.isUsed) {
      await ctx.db.patch(suggestionId, { isUsed: true, usedAt: Date.now() });
    }

    return true;
  },
});

import { action } from "./_generated/server";
import { generateKeywordsArgsValidator } from "./validators";
import { generateObject } from "ai";
import { z } from "zod";
import { createLLMModel } from "./lib/llmConfig";
import { internal, api } from "./_generated/api";

// =============================================================================
// KEYWORD GENERATION SYSTEM
// =============================================================================
/**
 * USAGE:
 *
 * This action generates targeted keywords based on user descriptions
 * using Grok (preferred) or GPT-4o (fallback) for optimal Twitter/X understanding.
 *
 * Key features:
 * - Uses Grok (grok-4-fast) for Twitter-optimized generation when available
 * - Falls back to GPT-4o if Grok is unavailable or misconfigured
 * - Generates configurable number of high-quality keywords
 * - Follows established logging and error handling patterns
 * - Returns structured data compatible with frontend KeywordItem interface
 */

// Import shared validation and request utilities
import { validateDescriptionForKeywords } from "../shared/lib/utils/validation";
import { generateRequestId } from "../shared/lib/utils/request";

// Configuration constants
const KEYWORD_GENERATION_CONFIG = {
  TARGET_KEYWORD_COUNT: 15, // Generate 15 keywords at a time
} as const;

// Simplified schema for keyword generation results (MVP)
const KeywordGenerationSchema = z
  .object({
    keywords: z
      .array(
        z.object({
          keyword: z
            .string()
            .min(1)
            .max(100)
            .describe("Keyword or phrase for searching potential customers"),
          exactMatch: z
            .boolean()
            .describe(
              "Whether this keyword should be searched as an exact phrase match"
            ),
        })
      )
      .length(KEYWORD_GENERATION_CONFIG.TARGET_KEYWORD_COUNT)
      .describe(
        `Array of ${KEYWORD_GENERATION_CONFIG.TARGET_KEYWORD_COUNT} creative buyer-intent keywords`
      ),
  })
  .describe("Keyword generation results for lead qualification");

export const generateKeywords = action({
  args: generateKeywordsArgsValidator,
  handler: async (ctx, { userDescription, workspaceId }) => {
    const startTime = Date.now();
    const requestId = generateRequestId("keyword_gen");

    console.log(`[KEYWORD_GEN] Starting request ${requestId}`, {
      userDescription: userDescription.substring(0, 100) + "...",
      descriptionLength: userDescription.length,
      timestamp: new Date().toISOString(),
    });

    try {
      // Validate user description with comprehensive logging
      const descriptionValidation =
        validateDescriptionForKeywords(userDescription);
      if (!descriptionValidation.isValid) {
        console.error(
          `[KEYWORD_GEN] ${requestId} - Description validation failed:`,
          {
            error: descriptionValidation.error,
            providedDescription: userDescription.substring(0, 100) + "...",
          }
        );
        throw new Error(`Invalid description: ${descriptionValidation.error}`);
      }

      console.log(
        `[KEYWORD_GEN] ${requestId} - Description validation passed`,
        {
          descriptionLength: userDescription.length,
        }
      );

      // Enhanced prompt with creativity and personal touch emphasis
      const prompt = `You are an expert potential customer finding AI agent for ReacherX, a platform that helps anyone find potential customers on social media. Your expertise lies in crafting inventive, emotionally resonant search queries that surface genuine buyer intent on Twitter/X, using creative language to mimic real people's frustrations, humor, and vulnerabilities—while filtering out promotional noise from sellers, affiliates, and spammers.

The following is the description that the user has provided:
"${userDescription}"

Your task: Generate exactly ${KEYWORD_GENERATION_CONFIG.TARGET_KEYWORD_COUNT} creative, precise search queries (as keywords/phrases) to discover potential customers actively expressing buying needs for the described product/service/skill. Focus on organic, personal language that reveals unmet needs through emotions like frustration, self-doubt, or light humor (e.g., "I suck at [pain point]", "lol this [issue] sucks"). These queries should minimize seller hijacks by sounding like everyday user vents. Ensure diversity in phrasing, emotional tone, and specificity across all items—shown in batches of 5. Mentally simulate searching each on Twitter/X: Only include if it likely yields 70%+ buyer-intent results (e.g., personal stories/questions) over promotions.

Sort by quality:
(1) Emotional resonance/personal touch (high)
(2) Relevance to user description,
(3) Low competition/high conversion.

Guidelines to Avoid Hijacked Keywords:
1. Keep concise: 2-4 words max (for platform limits), blending specificity from user description with creative flair.
2. Buyer-oriented modifiers: Use words like 'help me', 'stuck on', 'recommend something', but make them personal/emotional.
3. Natural exclusions: Imply individual struggles (e.g., 'my [pain] is embarrassing' to avoid commercial pitches).
4. Blend formal/industry terms with slang, typos, abbreviations, and creative twists (e.g., 'lead managment fail' or 'CRM nightmare vibes').
5. Diversify intent/emotion: 40% frustration (e.g., "sucks"), 30% questions/seeking (e.g., "what's good for?"), 20% humor/self-deprecation (e.g., "lol I suck at"), 10% urgency (e.g., "desperately need").
6. Prioritize low-competition signals: Target small user vibes (individuals/teams), not marketer lingo.
7. Include typos sparingly (10-20% of keywords) for realism, like common misspellings in emotional rants.
8. Creativity Mandate: Infuse personal touch in at least 50%—use first-person ("I", "my team"), emojis in phrasing if natural (e.g., "customer tracking hell 😩"), or casual exclamations to evoke relatability.

Examples tailored to user description (adapt these creatively):
- If user description is "CRM for small businesses": "I suck at lead tracking lol" (frustration, exactMatch: true)
- "Why is customer management so hard? 😩" (question, exactMatch: false)
- "Small team CRM disaster stories" (personal vent, exactMatch: false)
- Avoid generic: No "buy CRM" or "best tool"—focus on pains like "losing deals to bad follow-ups".

For each query, provide:
- The exact keyword/phrase to search for (Do not add quotes).
- exactMatch: boolean (true for precise emotional phrases/questions to catch exact vents; false for broader emotional themes).

Output ONLY valid JSON matching the schema (no additional text):

{
  "keywords": [
    {
      "keyword": "string", 
      "exactMatch": true
    }
  ]
}`;

      // Get the model configuration using centralized system
      const modelConfig = createLLMModel("keyword_generation");

      console.log(
        `[KEYWORD_GEN] ${requestId} - Calling LLM for keyword generation:`,
        {
          promptLength: prompt.length,
          model: modelConfig.modelName,
          temperature: modelConfig.temperature,
          usedFallback: modelConfig.usedFallback,
          configSource: modelConfig.configSource,
        }
      );

      // Call LLM with structured output
      const llmStartTime = Date.now();
      const result = await generateObject({
        model: modelConfig.model,
        schema: KeywordGenerationSchema,
        prompt: prompt,
        temperature: modelConfig.temperature,
      });
      const llmEndTime = Date.now();

      console.log(`[KEYWORD_GEN] ${requestId} - LLM call completed:`, {
        processingTimeMs: llmEndTime - llmStartTime,
        keywordCount: result.object?.keywords?.length || 0,
        modelUsed: modelConfig.modelName,
        usedFallback: modelConfig.usedFallback,
        usage: result.usage,
      });

      // Validate LLM response
      if (!result.object?.keywords || !Array.isArray(result.object.keywords)) {
        console.error(
          `[KEYWORD_GEN] ${requestId} - Invalid LLM response format:`,
          {
            responseType: typeof result.object,
            hasKeywords: !!result.object?.keywords,
            keywordsType: typeof result.object?.keywords,
            isArray: Array.isArray(result.object?.keywords),
            response: result.object,
            modelUsed: modelConfig.modelName,
          }
        );
        throw new Error(
          `${modelConfig.modelName} returned invalid response format - expected object with keywords array`
        );
      }

      const keywords = result.object.keywords;

      // Validate keyword count (log-only if mismatch; proceed with what we have)
      if (keywords.length !== KEYWORD_GENERATION_CONFIG.TARGET_KEYWORD_COUNT) {
        console.warn(`[KEYWORD_GEN] ${requestId} - Keyword count mismatch`, {
          expected: KEYWORD_GENERATION_CONFIG.TARGET_KEYWORD_COUNT,
          received: keywords.length,
          modelUsed: modelConfig.modelName,
        });
      }

      console.log(`[KEYWORD_GEN] ${requestId} - Generated keywords summary:`, {
        keywordCount: keywords.length,
        sample: keywords.slice(0, 3),
      });

      // Transform to frontend-compatible format
      const frontendKeywords = keywords.map((kw, index) => ({
        id: `generated_${Date.now()}_${index}`,
        keyword: kw.keyword,
        timestamp: new Date().toISOString(),
        metadata: {
          generatedAt: Date.now(),
          source: modelConfig.modelName,
          usedFallback: modelConfig.usedFallback,
          exactMatch: kw.exactMatch,
        },
      }));

      const endTime = Date.now();

      // Persist suggestions to Convex for authenticated users
      const identity = await ctx.auth.getUserIdentity();
      if (identity) {
        let targetWorkspaceId = workspaceId ?? null;
        if (!targetWorkspaceId) {
          const defaultWorkspace = await ctx.runQuery(
            api.workspaces.getDefaultWorkspace,
            {}
          );
          if (defaultWorkspace) {
            targetWorkspaceId = defaultWorkspace._id;
          }
        }
        if (targetWorkspaceId) {
          const suggestionsPayload = frontendKeywords.map((k) => ({
            keyword: k.keyword,
            metadata: k.metadata,
          }));
          await ctx.runMutation(internal.keywordSuggestions.storeSuggestions, {
            workspaceId: targetWorkspaceId,
            userDescription,
            batchRequestId: requestId,
            suggestions: suggestionsPayload,
          });
        }
      }
      console.log(
        `[KEYWORD_GEN] ${requestId} - Request completed successfully:`,
        {
          totalProcessingTimeMs: endTime - startTime,
          llmProcessingTimeMs: llmEndTime - llmStartTime,
          finalKeywordCount: frontendKeywords.length,
          modelUsed: modelConfig.modelName,
          usedFallback: modelConfig.usedFallback,
        }
      );

      return {
        success: true,
        data: {
          keywords: frontendKeywords,
          metadata: {
            requestId,
            generatedAt: Date.now(),
            processingTimeMs: endTime - startTime,
            llmProcessingTimeMs: llmEndTime - llmStartTime,
            userDescriptionLength: userDescription.length,
            modelUsed: modelConfig.modelName,
            usedFallback: modelConfig.usedFallback,
          },
        },
      };
    } catch (error) {
      const endTime = Date.now();
      console.error(`[KEYWORD_GEN] ${requestId} - Request failed:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: endTime - startTime,
        userDescriptionLength: userDescription.length,
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Keyword generation failed",
        data: null,
        metadata: {
          requestId,
          processingTimeMs: endTime - startTime,
          fallbackUsed: true,
        },
      };
    }
  },
});
