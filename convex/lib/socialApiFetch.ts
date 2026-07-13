import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { acquireSocialApiBudget } from "./socialApiBudget";
import {
  estimateSocialApiBillableUnits,
  recordProviderRequestOutcome,
  SOCIAL_API_COST_PER_ENTITY_USD,
  type ProviderUsageEstimate,
} from "./providerReliability";
import { getCurrentUTCTimestamp } from "../../shared/lib/utils/time/timeUtils";

type SocialApiRequestMetadata = {
  workspaceId?: Id<"workspaces">;
  prospectId?: Id<"prospects">;
  autoPlanRunId?: Id<"autoPlanRuns">;
  estimateUsage?: (payload: unknown) => ProviderUsageEstimate;
  healthEvidence?: boolean;
};

function getEndpoint(input: string | URL | Request) {
  const rawUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  try {
    return new URL(rawUrl).pathname;
  } catch {
    return "unknown";
  }
}

function getSocialApiApplicationError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (record.status !== "error") {
    return null;
  }
  return new Error(
    typeof record.message === "string"
      ? record.message
      : "SocialAPI returned an error"
  );
}

export async function fetchSocialApi(
  ctx: ActionCtx,
  consumer: string,
  input: string | URL | Request,
  init?: RequestInit,
  metadata?: SocialApiRequestMetadata
) {
  const request = {
    consumer,
    endpoint: getEndpoint(input),
    workspaceId: metadata?.workspaceId,
    prospectId: metadata?.prospectId,
    autoPlanRunId: metadata?.autoPlanRunId,
  };
  await acquireSocialApiBudget(ctx, consumer, {
    workspaceId: metadata?.workspaceId,
    prospectId: metadata?.prospectId,
    autoPlanRunId: metadata?.autoPlanRunId,
  });
  const startedAt = getCurrentUTCTimestamp();
  let failureRecorded = false;

  try {
    const response = await fetch(input, init);
    let payload: unknown;
    try {
      payload = await response.clone().json();
    } catch {
      payload = await response.clone().text();
    }

    const applicationError = getSocialApiApplicationError(payload);
    if (!response.ok || applicationError) {
      const error =
        applicationError ??
        new Error(
          typeof payload === "string"
            ? payload ||
                `SocialAPI request failed with status ${response.status}`
            : `SocialAPI request failed with status ${response.status}: ${JSON.stringify(payload)}`
        );
      await recordProviderRequestOutcome({
        ctx,
        provider: "socialapi",
        request,
        startedAt,
        outcome: "error",
        httpStatus: response.status,
        error,
      });
      failureRecorded = true;
      if (applicationError) {
        throw applicationError;
      }
      return response;
    }

    const usage = metadata?.estimateUsage
      ? metadata.estimateUsage(payload)
      : (() => {
          const billableUnits = estimateSocialApiBillableUnits(payload);
          return {
            billableUnits,
            estimatedCostUsd: billableUnits * SOCIAL_API_COST_PER_ENTITY_USD,
          };
        })();
    await recordProviderRequestOutcome({
      ctx,
      provider: "socialapi",
      request,
      startedAt,
      outcome: "success",
      httpStatus: response.status,
      usage,
      healthEvidence: metadata?.healthEvidence,
    });
    return response;
  } catch (error) {
    if (!failureRecorded) {
      await recordProviderRequestOutcome({
        ctx,
        provider: "socialapi",
        request,
        startedAt,
        outcome: "error",
        error,
      });
    }
    throw error;
  }
}
