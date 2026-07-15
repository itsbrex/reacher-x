import type { LanguageModelMiddleware, ProviderMetadata } from "ai";
import { normalizeUnknownError } from "./errorHelpers";

type WrapGenerateOptions = Parameters<
  NonNullable<LanguageModelMiddleware["wrapGenerate"]>
>[0];
type WrapStreamOptions = Parameters<
  NonNullable<LanguageModelMiddleware["wrapStream"]>
>[0];

type Source = {
  type: "source";
  sourceType: "url";
  id: string;
  url: string;
  title?: string;
  providerMetadata?: ProviderMetadata;
};

const MAX_CONVEX_TELEMETRY_DEPTH = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringProperty(obj: unknown, key: string): string | undefined {
  if (!isRecord(obj)) return undefined;
  const value = obj[key];
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function sanitizeJsonValue(value: unknown, depth = 0): unknown {
  if (value === null) return null;
  if (depth >= MAX_CONVEX_TELEMETRY_DEPTH) {
    return "[Truncated nested telemetry]";
  }

  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
      return value;
    case "bigint":
      return value.toString();
    case "undefined":
    case "function":
    case "symbol":
      return undefined;
    case "object":
      if (value instanceof Date) {
        return value.toISOString();
      }

      if (Array.isArray(value)) {
        return value
          .map((item) => sanitizeJsonValue(item, depth + 1))
          .filter((item) => item !== undefined);
      }

      if (!isRecord(value)) {
        return undefined;
      }

      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !key.startsWith("$") && !key.startsWith("."))
          .map(
            ([key, entryValue]) =>
              [key, sanitizeJsonValue(entryValue, depth + 1)] as const
          )
          .filter(([, entryValue]) => entryValue !== undefined)
      );
    default:
      return undefined;
  }
}

function providerMetadataFromUnknown(
  value: unknown
): ProviderMetadata | undefined {
  const sanitized = sanitizeJsonValue(value);
  if (!isRecord(sanitized)) {
    return undefined;
  }

  const providerMetadata = Object.fromEntries(
    Object.entries(sanitized).filter(([, entryValue]) => isRecord(entryValue))
  );

  return Object.keys(providerMetadata).length > 0
    ? (providerMetadata as ProviderMetadata)
    : undefined;
}

function sourceKey(source: Source): string {
  return source.sourceType === "url"
    ? `${source.sourceType}:${source.url}:${source.title ?? ""}`
    : `${source.sourceType}:${source.id}:${source.title}`;
}

function isSourceLike(value: unknown): value is Source {
  return isRecord(value) && value.type === "source";
}

function getOpenRouterMetadata(
  providerMetadata: ProviderMetadata | undefined
): Record<string, unknown> | undefined {
  if (!providerMetadata) {
    return undefined;
  }

  const openrouter = providerMetadata.openrouter;
  return isRecord(openrouter) ? openrouter : undefined;
}

export function normalizeOpenRouterProviderMetadata(
  providerMetadata: ProviderMetadata | undefined
): ProviderMetadata | undefined {
  const normalized = providerMetadataFromUnknown(providerMetadata);
  if (!normalized?.openrouter || !isRecord(normalized.openrouter)) {
    return normalized;
  }

  const { annotations: _annotations, ...restOpenRouter } =
    normalized.openrouter;
  return {
    ...normalized,
    openrouter: restOpenRouter,
  };
}

export function extractOpenRouterSources(
  providerMetadata: ProviderMetadata | undefined
): Source[] {
  const openrouter = getOpenRouterMetadata(providerMetadata);
  const annotations = openrouter?.annotations;
  if (!Array.isArray(annotations)) {
    return [];
  }

  return annotations.flatMap((annotation, index) => {
    const url = getStringProperty(annotation, "url");
    if (!url) {
      return [];
    }

    return [
      {
        type: "source" as const,
        sourceType: "url" as const,
        id:
          getStringProperty(annotation, "id") ??
          `openrouter-source-${index + 1}`,
        url,
        title:
          getStringProperty(annotation, "title") ??
          getStringProperty(annotation, "source_title"),
      },
    ];
  });
}

function mergeSources(
  existingSources: Source[],
  additionalSources: Source[]
): Source[] {
  const merged = [...existingSources];
  const seen = new Set(existingSources.map(sourceKey));

  for (const source of additionalSources) {
    const key = sourceKey(source);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(source);
  }

  return merged;
}

function normalizeContentArray<T extends unknown[]>(
  content: T,
  additionalSources: Source[]
): T {
  const normalizedContent = content.map((part) => {
    if (!isRecord(part) || !("providerMetadata" in part)) {
      return part;
    }

    return {
      ...part,
      providerMetadata: normalizeOpenRouterProviderMetadata(
        part.providerMetadata as ProviderMetadata | undefined
      ),
    };
  });

  const mergedContent = mergeSources(
    normalizedContent.filter(isSourceLike),
    additionalSources
  );

  if (mergedContent.length === normalizedContent.filter(isSourceLike).length) {
    return normalizedContent as T;
  }

  const nonSourceContent = normalizedContent.filter(
    (part) => !isSourceLike(part)
  );
  return [...nonSourceContent, ...mergedContent] as T;
}

function normalizeStreamErrors<T>(
  stream: ReadableStream<T>
): ReadableStream<T> {
  let reader: ReadableStreamDefaultReader<T> | null = stream.getReader();

  return new ReadableStream<T>({
    async pull(controller) {
      if (!reader) {
        controller.close();
        return;
      }

      try {
        const { done, value } = await reader.read();
        if (done) {
          try {
            reader.releaseLock();
          } catch {
            // Best effort only.
          }
          reader = null;
          controller.close();
          return;
        }

        controller.enqueue(value);
      } catch (error) {
        const normalizedError = normalizeUnknownError(error);
        try {
          reader?.releaseLock();
        } catch {
          // Best effort only.
        }
        reader = null;
        controller.error(normalizedError);
      }
    },
    async cancel(reason) {
      if (!reader) {
        return;
      }

      try {
        await reader.cancel(reason);
      } finally {
        try {
          reader.releaseLock();
        } catch {
          // Best effort only.
        }
        reader = null;
      }
    },
  });
}

export function sanitizeTelemetryPayload(value: unknown): unknown {
  return sanitizeJsonValue(value) ?? null;
}

function getFiniteNumberProperty(
  obj: Record<string, unknown>,
  key: string
): number | undefined {
  const value = obj[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function sanitizeUsageSnapshotForConvex(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  const inputTokenDetails = isRecord(value.inputTokenDetails)
    ? value.inputTokenDetails
    : undefined;
  const cacheReadTokens =
    getFiniteNumberProperty(inputTokenDetails ?? {}, "cacheReadTokens") ??
    getFiniteNumberProperty(value, "cachedInputTokens");

  return Object.fromEntries(
    Object.entries({
      inputTokens: getFiniteNumberProperty(value, "inputTokens"),
      outputTokens: getFiniteNumberProperty(value, "outputTokens"),
      totalTokens: getFiniteNumberProperty(value, "totalTokens"),
      reasoningTokens: getFiniteNumberProperty(value, "reasoningTokens"),
      cachedInputTokens: cacheReadTokens,
      cacheReadTokens,
      cacheWriteTokens: getFiniteNumberProperty(
        inputTokenDetails ?? {},
        "cacheWriteTokens"
      ),
      noCacheTokens: getFiniteNumberProperty(
        inputTokenDetails ?? {},
        "noCacheTokens"
      ),
      cost: getFiniteNumberProperty(value, "cost"),
      modelSelected: getStringProperty(value, "modelSelected"),
      providerSelected: getStringProperty(value, "providerSelected"),
    }).filter(([, entryValue]) => entryValue !== undefined)
  );
}

export function sanitizeProviderMetadataForConvex(
  providerMetadata: unknown
): unknown {
  return sanitizeTelemetryPayload(
    normalizeOpenRouterProviderMetadata(
      providerMetadata as ProviderMetadata | undefined
    )
  );
}

/**
 * Marks the stable outreach prefix for OpenRouter's explicit GPT-5.6 prompt
 * cache. The first system message is the agent prompt and the second is the
 * current workspace description. Prospect-specific context follows and may
 * contain timestamps, so including it would prevent reliable cache reads.
 */
export const outreachPromptCacheMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v3",
  async transformParams({ params }) {
    const systemMessageIndexes = params.prompt.flatMap((message, index) =>
      message.role === "system" ? [index] : []
    );
    const cacheBreakpointIndex =
      systemMessageIndexes[1] ?? systemMessageIndexes[0];

    if (cacheBreakpointIndex === undefined) {
      return params;
    }

    return {
      ...params,
      prompt: params.prompt.map((message, index) => {
        if (index !== cacheBreakpointIndex) {
          return message;
        }

        const existingOpenRouterOptions = isRecord(
          message.providerOptions?.openrouter
        )
          ? message.providerOptions.openrouter
          : {};

        return {
          ...message,
          providerOptions: {
            ...message.providerOptions,
            openrouter: {
              ...existingOpenRouterOptions,
              cacheControl: { type: "ephemeral" },
            },
          },
        };
      }),
    };
  },
};

export const openRouterMetadataMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v3",
  async wrapGenerate({ doGenerate }: WrapGenerateOptions) {
    let result;
    try {
      result = await doGenerate();
    } catch (error) {
      throw normalizeUnknownError(error);
    }
    const additionalSources = extractOpenRouterSources(result.providerMetadata);

    return {
      ...result,
      content: normalizeContentArray(result.content, additionalSources),
      providerMetadata: normalizeOpenRouterProviderMetadata(
        result.providerMetadata
      ),
    };
  },
  async wrapStream({ doStream }: WrapStreamOptions) {
    let result;
    try {
      result = await doStream();
    } catch (error) {
      throw normalizeUnknownError(error);
    }
    const seenSources = new Set<string>();

    return {
      ...result,
      stream: normalizeStreamErrors(
        result.stream.pipeThrough(
          new TransformStream({
            transform(part, controller) {
              const providerMetadata =
                isRecord(part) && "providerMetadata" in part
                  ? (part.providerMetadata as ProviderMetadata | undefined)
                  : undefined;

              for (const source of extractOpenRouterSources(providerMetadata)) {
                const key = sourceKey(source);
                if (seenSources.has(key)) {
                  continue;
                }
                seenSources.add(key);
                controller.enqueue(source);
              }

              if (!isRecord(part)) {
                controller.enqueue(part);
                return;
              }

              // Sanitize nested object values to strip $-prefixed keys
              // (e.g. $schema from OpenRouter) that Convex rejects. The
              // agent library persists stream deltas directly to the DB.
              const sanitized = Object.fromEntries(
                Object.entries(part).map(([key, val]) => [
                  key,
                  key === "providerMetadata"
                    ? normalizeOpenRouterProviderMetadata(providerMetadata)
                    : typeof val === "object" && val !== null
                      ? sanitizeJsonValue(val)
                      : val,
                ])
              );

              controller.enqueue(sanitized as unknown as typeof part);
            },
          })
        )
      ),
    };
  },
};
