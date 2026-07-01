// convex/lib/ai.ts
// OpenRouter provider setup for Convex actions
// Docs: https://openrouter.ai/docs

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, type JSONValue } from "ai";
import { z } from "zod";
import { logger } from "../../shared/lib/logger";
import { getCurrentUTCTimestamp } from "../../shared/lib/utils/time/timeUtils";

type OpenRouterProviderRouting = Record<string, JSONValue> & {
  only?: string[];
  order?: string[];
  allow_fallbacks?: boolean;
  require_parameters?: boolean;
};

export type OpenRouterProviderOptions = {
  openrouter: Record<string, JSONValue> & {
    provider: OpenRouterProviderRouting;
  };
};

// ============================================================================
// Provider Factory
// ============================================================================

/**
 * Creates an OpenRouter provider instance.
 *
 * OpenRouter provides:
 * - Provider routing for speed-focused inference
 * - Model/provider fallbacks
 * - Usage tracking and selected provider metadata
 * - Structured outputs
 *
 * @see https://openrouter.ai/docs/guides/overview/principles
 *
 * @example
 * ```typescript
 * import { generateText } from 'ai';
 * import { createAIProvider, AGENT_PROVIDER_OPTIONS, REASONING_MODEL } from './lib/ai';
 *
 * const provider = createAIProvider();
 * const { text } = await generateText({
 *   model: provider(REASONING_MODEL),
 *   providerOptions: AGENT_PROVIDER_OPTIONS,
 *   prompt: 'Hello!',
 * });
 * ```
 */
export function createAIProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "[AI] Missing OPENROUTER_API_KEY environment variable. " +
        "Get it from: https://openrouter.ai/settings/keys"
    );
  }

  return createOpenRouter({
    apiKey,
    // App attribution for OpenRouter analytics
    // https://openrouter.ai/docs/app-attribution
    headers: {
      "HTTP-Referer": "https://reacherx.com",
      "X-Title": "ReacherX",
    },
  });
}

// ============================================================================
// Model Identifiers
// ============================================================================

/** Available models via OpenRouter. */
export const MODELS = {
  KIMI_K2_6: "moonshotai/kimi-k2.6",
  GPT_OSS: "openai/gpt-oss-120b",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

export const OPENROUTER_PROVIDERS = {
  BASETEN: "baseten",
  WANDB_FP4: "wandb/fp4",
  DECART: "decart",
  CEREBRAS: "cerebras",
  GROQ: "groq",
} as const;

export const OPENROUTER_ROUTING_PRESETS = {
  CURRENT: "current",
  COST_OPTIMIZED: "cost_optimized",
} as const;

type OpenRouterProviderSlug =
  (typeof OPENROUTER_PROVIDERS)[keyof typeof OPENROUTER_PROVIDERS];
type OpenRouterRoutingPreset =
  (typeof OPENROUTER_ROUTING_PRESETS)[keyof typeof OPENROUTER_ROUTING_PRESETS];

const FAST_MODEL_TIMEOUT_MS = 10_000;
const REASONING_MODEL_TIMEOUT_MS = 45_000;

/**
 * The app supports two local routing presets:
 * - "current" preserves today's production model/provider behavior
 * - "cost_optimized" standardizes both fast and reasoning paths on GPT-OSS
 *
 * Switch presets with OPENROUTER_ROUTING_PRESET=current|cost_optimized.
 */
const DEFAULT_OPENROUTER_ROUTING_PRESET: OpenRouterRoutingPreset =
  OPENROUTER_ROUTING_PRESETS.COST_OPTIMIZED;

function createOrderedProviderOptions(args: {
  order: OpenRouterProviderSlug[];
  allowFallbacks?: boolean;
  requireParameters?: boolean;
}): OpenRouterProviderOptions {
  const provider: OpenRouterProviderRouting = {
    order: args.order,
    require_parameters: args.requireParameters ?? true,
  };
  if (args.allowFallbacks !== undefined) {
    provider.allow_fallbacks = args.allowFallbacks;
  }

  return {
    openrouter: {
      provider,
    },
  };
}

function createOnlyProviderOptions(
  only: OpenRouterProviderSlug[]
): OpenRouterProviderOptions {
  return {
    openrouter: {
      provider: {
        only,
        require_parameters: true,
      },
    },
  };
}

type RoutingModelConfig = {
  model: ModelId;
  providerOptions: OpenRouterProviderOptions;
  providerLabel: string;
  timeoutMs: number;
};

type RoutingPresetConfig = Record<ModelRouting, RoutingModelConfig>;

const CURRENT_ROUTING_CONFIG: RoutingPresetConfig = {
  fast: {
    model: MODELS.GPT_OSS,
    providerOptions: createOnlyProviderOptions([OPENROUTER_PROVIDERS.CEREBRAS]),
    providerLabel: OPENROUTER_PROVIDERS.CEREBRAS,
    timeoutMs: FAST_MODEL_TIMEOUT_MS,
  },
  reasoning: {
    model: MODELS.KIMI_K2_6,
    providerOptions: createOrderedProviderOptions({
      order: [OPENROUTER_PROVIDERS.BASETEN, OPENROUTER_PROVIDERS.WANDB_FP4],
      allowFallbacks: false,
    }),
    providerLabel: `${OPENROUTER_PROVIDERS.BASETEN}/${OPENROUTER_PROVIDERS.WANDB_FP4}`,
    timeoutMs: REASONING_MODEL_TIMEOUT_MS,
  },
};

const COST_OPTIMIZED_ROUTING_CONFIG: RoutingPresetConfig = {
  fast: {
    model: MODELS.GPT_OSS,
    providerOptions: createOrderedProviderOptions({
      order: [OPENROUTER_PROVIDERS.CEREBRAS, OPENROUTER_PROVIDERS.GROQ],
      allowFallbacks: true,
    }),
    providerLabel: `${OPENROUTER_PROVIDERS.CEREBRAS}/${OPENROUTER_PROVIDERS.GROQ}`,
    timeoutMs: FAST_MODEL_TIMEOUT_MS,
  },
  reasoning: {
    model: MODELS.GPT_OSS,
    providerOptions: createOrderedProviderOptions({
      order: [OPENROUTER_PROVIDERS.CEREBRAS, OPENROUTER_PROVIDERS.GROQ],
      allowFallbacks: true,
    }),
    providerLabel: `${OPENROUTER_PROVIDERS.CEREBRAS}/${OPENROUTER_PROVIDERS.GROQ}`,
    timeoutMs: REASONING_MODEL_TIMEOUT_MS,
  },
};

function getConfiguredRoutingPreset(): OpenRouterRoutingPreset {
  const configuredPreset = process.env.OPENROUTER_ROUTING_PRESET;
  if (configuredPreset === OPENROUTER_ROUTING_PRESETS.CURRENT) {
    return OPENROUTER_ROUTING_PRESETS.CURRENT;
  }
  if (configuredPreset === OPENROUTER_ROUTING_PRESETS.COST_OPTIMIZED) {
    return OPENROUTER_ROUTING_PRESETS.COST_OPTIMIZED;
  }
  return DEFAULT_OPENROUTER_ROUTING_PRESET;
}

const ACTIVE_OPENROUTER_ROUTING_PRESET = getConfiguredRoutingPreset();

function getRoutingPresetConfig(): RoutingPresetConfig {
  if (ACTIVE_OPENROUTER_ROUTING_PRESET === OPENROUTER_ROUTING_PRESETS.CURRENT) {
    return CURRENT_ROUTING_CONFIG;
  }
  return COST_OPTIMIZED_ROUTING_CONFIG;
}

export const FAST_MODEL = getRoutingPresetConfig().fast.model;
export const REASONING_MODEL = getRoutingPresetConfig().reasoning.model;
export const HELPER_MODEL = MODELS.GPT_OSS;
export const AUTOCOMPLETE_MODEL = HELPER_MODEL;

export const AGENT_PROVIDER_OPTIONS: OpenRouterProviderOptions =
  getRoutingPresetConfig().reasoning.providerOptions;

export const FAST_PROVIDER_OPTIONS: OpenRouterProviderOptions =
  getRoutingPresetConfig().fast.providerOptions;

/**
 * Background helper AI runs on a separate Groq lane so autocomplete and other
 * non-critical helpers cannot consume the pinned main-agent provider capacity.
 */
export const HELPER_PROVIDER_OPTIONS: OpenRouterProviderOptions =
  createOnlyProviderOptions([OPENROUTER_PROVIDERS.GROQ]);
export const AUTOCOMPLETE_PROVIDER_OPTIONS = HELPER_PROVIDER_OPTIONS;

/**
 * Tool-calling agents are pinned to Cerebras because streamed multi-step runs
 * aborted intermittently when OpenRouter routed GPT-OSS traffic to Groq.
 *
 * Keep this route separate from the broader preset-based fast/reasoning
 * routing so autocomplete and non-agent text generation can still evolve
 * independently.
 */
export const PINNED_AGENT_MODEL = MODELS.GPT_OSS;

export const PINNED_AGENT_PROVIDER_OPTIONS: OpenRouterProviderOptions =
  createOnlyProviderOptions([OPENROUTER_PROVIDERS.CEREBRAS]);

export type ModelRouting = "fast" | "reasoning";
type JsonFailureLogLevel = "error" | "warn" | "info";
const aiLogger = logger.withScope("AI");

/**
 * Backward-compatible alias for older fast-route imports.
 * Prefer FAST_PROVIDER_OPTIONS for new code.
 */
export const CEREBRAS_PROVIDER_OPTIONS = FAST_PROVIDER_OPTIONS;

export function getActiveOpenRouterRoutingPreset(): OpenRouterRoutingPreset {
  return ACTIVE_OPENROUTER_ROUTING_PRESET;
}

export function getOpenRouterExtraBody(
  providerOptions: OpenRouterProviderOptions
): Record<string, JSONValue> {
  return providerOptions.openrouter;
}

function getModelForRouting(routing: ModelRouting): RoutingModelConfig {
  return getRoutingPresetConfig()[routing];
}

export function getRoutingTelemetry(routing: ModelRouting): {
  model: ModelId;
  providerLabel: string;
  timeoutMs: number;
} {
  const { model, providerLabel, timeoutMs } = getModelForRouting(routing);

  return {
    model,
    providerLabel,
    timeoutMs,
  };
}

function logJsonFailure(level: JsonFailureLogLevel, ...args: unknown[]) {
  if (level === "info") {
    aiLogger.info(...args);
    return;
  }

  if (level === "warn") {
    aiLogger.warn(...args);
    return;
  }

  aiLogger.error(...args);
}

function logJsonAttemptFailure(level: JsonFailureLogLevel, ...args: unknown[]) {
  logJsonFailure(level === "info" ? "info" : "warn", ...args);
}

// ============================================================================
// Usage Extraction
// ============================================================================

/**
 * Extracts usage information from AI SDK response.
 * Works with OpenRouter's usage tracking.
 *
 * @see https://openrouter.ai/docs/guides/community/vercel-ai-sdk
 */
export function extractUsage(result: {
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };

  providerMetadata?: any;
  experimental_providerMetadata?: any;
}): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number;
  modelSelected?: string;
  providerSelected?: string;
} {
  const usage = result.usage || {};
  const metadata =
    result.providerMetadata?.openrouter ??
    result.experimental_providerMetadata?.openrouter;

  // OpenRouter returns cost as a decimal string, so parse it
  const rawCost = metadata?.usage?.cost;
  const parsedCost =
    rawCost !== undefined ? parseFloat(String(rawCost)) : undefined;
  const cost =
    parsedCost !== undefined && isFinite(parsedCost) ? parsedCost : undefined;

  return {
    inputTokens: usage.promptTokens || 0,
    outputTokens: usage.completionTokens || 0,
    totalTokens: usage.totalTokens || 0,
    cost,
    modelSelected: metadata?.model,
    providerSelected: metadata?.provider,
  };
}

export function extractJsonPayload(text: string) {
  let jsonStr = text.trim();

  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  const objectStart = jsonStr.indexOf("{");
  const arrayStart = jsonStr.indexOf("[");
  const starts = [objectStart, arrayStart].filter((index) => index >= 0);
  if (starts.length === 0) {
    return jsonStr;
  }

  const start = Math.min(...starts);
  const objectEnd = jsonStr.lastIndexOf("}");
  const arrayEnd = jsonStr.lastIndexOf("]");
  const end = Math.max(objectEnd, arrayEnd);

  if (end > start) {
    return jsonStr.slice(start, end + 1).trim();
  }

  return jsonStr;
}

// ============================================================================
// Robust Structured Output Generation
// ============================================================================

interface RobustGenerateObjectOptions<T> {
  /** Operation name for logging */
  operation: string;
  /** Zod schema for the output */
  schema: z.ZodType<T>;
  /** System prompt */
  system: string;
  /** User prompt */
  prompt: string;
  /** Temperature (default: 0.5) */
  temperature?: number;
  /** Maximum completion tokens to request from the provider. */
  maxOutputTokens?: number;
  /** Maximum retry attempts per model (default: 2) */
  maxRetries?: number;
  /** Initial delay between retries in ms (default: 500) */
  initialDelayMs?: number;
  /** fast/reasoning resolve through the active local routing preset */
  routing?: ModelRouting;
  /** Optional repair step before Zod validation for known provider edge cases. */
  normalizeParsed?: (value: unknown) => unknown;
  /**
   * Defaults to error/warn. Use info for optional AI steps whose callers
   * intentionally recover with deterministic fallback data.
   */
  failureLogLevel?: JsonFailureLogLevel;
}

/**
 * Robustly generates a structured object with explicit model routing.
 * The active preset decides which model/providers back "fast" and "reasoning".
 * In the cost-optimized preset both routes use GPT-OSS with different timeouts.
 */
export async function robustGenerateObject<T>({
  operation,
  schema,
  system,
  prompt,
  temperature = 0.5,
  maxOutputTokens,
  maxRetries = 2,
  initialDelayMs = 500,
  routing = "reasoning",
  normalizeParsed,
  failureLogLevel = "error",
}: RobustGenerateObjectOptions<T>): Promise<{
  object: T;
  model: string;
  usage: ReturnType<typeof extractUsage>;
  providerMetadata?: unknown;
}> {
  if (routing === "fast") {
    try {
      return await generateTextWithJsonParse({
        operation,
        schema,
        system,
        prompt,
        temperature,
        maxOutputTokens,
        maxRetries: 1,
        initialDelayMs,
        routing,
        normalizeParsed,
        failureLogLevel,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logJsonAttemptFailure(
        failureLogLevel,
        `[AI] ${operation} fast JSON generation failed; falling back to reasoning route:`,
        errorMessage
      );

      return robustGenerateObject({
        operation,
        schema,
        system,
        prompt,
        temperature,
        maxOutputTokens,
        maxRetries: 1,
        initialDelayMs,
        routing: "reasoning",
        normalizeParsed,
        failureLogLevel,
      });
    }
  }

  return generateTextWithJsonParse({
    operation,
    schema,
    system,
    prompt,
    temperature,
    maxOutputTokens,
    maxRetries,
    initialDelayMs,
    routing,
    normalizeParsed,
    failureLogLevel,
  });
}

/**
 * Fallback: Generate text and manually parse JSON.
 * Use this when generateObject fails repeatedly.
 */
export async function generateTextWithJsonParse<T>({
  operation,
  schema,
  system,
  prompt,
  temperature = 0.5,
  maxOutputTokens,
  maxRetries = 2,
  initialDelayMs = 500,
  routing = "fast",
  normalizeParsed,
  failureLogLevel = "error",
}: RobustGenerateObjectOptions<T>): Promise<{
  object: T;
  model: string;
  usage: ReturnType<typeof extractUsage>;
  providerMetadata?: unknown;
}> {
  const provider = createAIProvider();
  const modelConfig = getModelForRouting(routing);
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema), null, 2);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const startTime = getCurrentUTCTimestamp();

    try {
      const result = await generateText({
        model: provider(modelConfig.model) as any,
        system: `${system}\n\nIMPORTANT: You MUST respond with ONLY valid JSON. No markdown, no explanations, just one JSON object that validates against the provided JSON Schema.`,
        prompt: `${prompt}\n\nReturn exactly one JSON object matching this JSON Schema:\n${jsonSchema}\n\nDo not rename keys. Do not wrap the object in another property. Do not return an array unless the schema root is an array.`,
        temperature,
        ...(maxOutputTokens ? { maxOutputTokens } : {}),
        providerOptions: modelConfig.providerOptions,
        ...(modelConfig.timeoutMs
          ? { abortSignal: AbortSignal.timeout(modelConfig.timeoutMs) }
          : {}),
      });

      const parsed = JSON.parse(extractJsonPayload(result.text));
      const validated = schema.parse(
        normalizeParsed ? normalizeParsed(parsed) : parsed
      );

      const usage = extractUsage(result);

      return {
        object: validated,
        model: usage.modelSelected ?? modelConfig.model,
        usage,
        providerMetadata: (result as { providerMetadata?: unknown })
          .providerMetadata,
      };
    } catch (error) {
      const durationMs = getCurrentUTCTimestamp() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      lastError = error instanceof Error ? error : new Error(errorMessage);

      logJsonAttemptFailure(
        failureLogLevel,
        `[AI] ${operation} JSON attempt ${attempt + 1} failed on ${modelConfig.model}:`,
        errorMessage,
        `(${durationMs}ms)`
      );

      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logJsonFailure(
    failureLogLevel,
    `[AI] ${operation} JSON generation failed:`,
    lastError?.message
  );
  throw lastError || new Error("Failed to generate structured JSON");
}
