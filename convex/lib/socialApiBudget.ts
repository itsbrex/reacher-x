import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import {
  assertProviderRequestAllowed,
  type ProviderRequestContext,
} from "./providerReliability";
import { getSystemRuntimeConfig } from "./runtimeConfigHelpers";

export const SOCIAL_API_PROVIDER = "socialapi";

export function getSocialApiBudgetConfig() {
  return getSystemRuntimeConfig().providers.socialApi;
}

export async function acquireSocialApiBudget(
  ctx: ActionCtx,
  consumer: string,
  requestContext?: Omit<ProviderRequestContext, "consumer" | "endpoint">
) {
  await assertProviderRequestAllowed(ctx, "socialapi", {
    consumer,
    endpoint: consumer,
    ...requestContext,
  });
  return await ctx.runAction(
    internal.socialApiBudget.acquireSocialApiBudgetInternal,
    {
      consumer,
    }
  );
}
