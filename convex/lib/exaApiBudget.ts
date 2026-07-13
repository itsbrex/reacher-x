import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";

export const EXA_API_PROVIDER = "exa";
export const EXA_API_TARGET_REQUESTS_PER_SECOND = 8;
export const EXA_API_REQUEST_SPACING_MS = Math.ceil(
  1_000 / EXA_API_TARGET_REQUESTS_PER_SECOND
);
export const EXA_API_OCC_RETRY_BASE_MS = 25;
export const EXA_API_OCC_RETRY_JITTER_MS = 40;

export async function acquireExaApiBudget(ctx: ActionCtx, consumer: string) {
  return await ctx.runAction(
    internal.exaApiBudget.acquireExaApiBudgetInternal,
    {
      consumer,
    }
  );
}
