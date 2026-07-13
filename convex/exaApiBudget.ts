import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./lib/functionBuilders";
import {
  EXA_API_OCC_RETRY_BASE_MS,
  EXA_API_OCC_RETRY_JITTER_MS,
  EXA_API_PROVIDER,
  EXA_API_REQUEST_SPACING_MS,
  EXA_API_TARGET_REQUESTS_PER_SECOND,
} from "./lib/exaApiBudget";
import { getCurrentUTCTimestamp } from "../shared/lib/utils/time/timeUtils";

export const reserveExaApiBudgetSlotInternal = internalMutation({
  args: { consumer: v.string() },
  handler: async (ctx, { consumer }) => {
    const now = getCurrentUTCTimestamp();
    const existing = await ctx.db
      .query("exaApiBudgetState")
      .withIndex("by_provider", (q) => q.eq("provider", EXA_API_PROVIDER))
      .first();
    const reservedAt = Math.max(now, existing?.nextAvailableAt ?? now);
    const nextAvailableAt = reservedAt + EXA_API_REQUEST_SPACING_MS;

    if (existing) {
      await ctx.db.patch(existing._id, {
        nextAvailableAt,
        updatedAt: now,
        lastConsumer: consumer,
      });
    } else {
      await ctx.db.insert("exaApiBudgetState", {
        provider: EXA_API_PROVIDER,
        nextAvailableAt,
        updatedAt: now,
        lastConsumer: consumer,
      });
    }

    return {
      waitMs: Math.max(0, reservedAt - now),
      spacingMs: EXA_API_REQUEST_SPACING_MS,
      targetRequestsPerSecond: EXA_API_TARGET_REQUESTS_PER_SECOND,
    };
  },
});

export const acquireExaApiBudgetInternal = internalAction({
  args: { consumer: v.string() },
  handler: async (
    ctx,
    { consumer }
  ): Promise<{
    waitMs: number;
    spacingMs: number;
    targetRequestsPerSecond: number;
  }> => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        const reservation: {
          waitMs: number;
          spacingMs: number;
          targetRequestsPerSecond: number;
        } = await ctx.runMutation(
          internal.exaApiBudget.reserveExaApiBudgetSlotInternal,
          { consumer }
        );
        if (reservation.waitMs > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, reservation.waitMs)
          );
        }
        return reservation;
      } catch (error) {
        if (attempt === 11) {
          throw error;
        }
        const jitter = Math.floor(Math.random() * EXA_API_OCC_RETRY_JITTER_MS);
        await new Promise((resolve) =>
          setTimeout(resolve, EXA_API_OCC_RETRY_BASE_MS + jitter)
        );
      }
    }
    throw new Error("Exa request budget could not be reserved");
  },
});
