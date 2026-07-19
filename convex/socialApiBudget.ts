import { v } from "convex/values";
import { getCurrentUTCTimestamp } from "../shared/lib/utils/time/timeUtils";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./lib/functionBuilders";
import {
  getSocialApiBudgetConfig,
  SOCIAL_API_PROVIDER,
} from "./lib/socialApiBudget";

export const reserveSocialApiBudgetSlotInternal = internalMutation({
  args: {
    consumer: v.string(),
  },
  handler: async (ctx, { consumer }) => {
    const config = getSocialApiBudgetConfig();
    const now = getCurrentUTCTimestamp();
    const existing = await ctx.db
      .query("socialApiBudgetState")
      .withIndex("by_provider", (q) => q.eq("provider", SOCIAL_API_PROVIDER))
      .first();

    const reservedAt = Math.max(now, existing?.nextAvailableAt ?? now);
    const nextAvailableAt = reservedAt + config.requestSpacingMs;

    if (existing) {
      await ctx.db.patch(existing._id, {
        nextAvailableAt,
        updatedAt: now,
        lastConsumer: consumer,
      });
    } else {
      await ctx.db.insert("socialApiBudgetState", {
        provider: SOCIAL_API_PROVIDER,
        nextAvailableAt,
        updatedAt: now,
        lastConsumer: consumer,
      });
    }

    return {
      waitMs: Math.max(0, reservedAt - now),
      spacingMs: config.requestSpacingMs,
      targetRequestsPerMinute: config.targetRequestsPerMinute,
    };
  },
});

export const acquireSocialApiBudgetInternal = internalAction({
  args: {
    consumer: v.string(),
  },
  handler: async (
    ctx,
    { consumer }
  ): Promise<{
    waitMs: number;
    spacingMs: number;
    targetRequestsPerMinute: number;
  }> => {
    const config = getSocialApiBudgetConfig();
    for (
      let attempt = 0;
      attempt < config.reservationMaxAttempts;
      attempt += 1
    ) {
      try {
        const reservation: {
          waitMs: number;
          spacingMs: number;
          targetRequestsPerMinute: number;
        } = await ctx.runMutation(
          internal.socialApiBudget.reserveSocialApiBudgetSlotInternal,
          {
            consumer,
          }
        );

        if (reservation.waitMs > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, reservation.waitMs)
          );
        }

        return reservation;
      } catch (error) {
        const isLastAttempt = attempt === config.reservationMaxAttempts - 1;
        if (isLastAttempt) {
          throw error;
        }

        const jitter = Math.floor(Math.random() * config.occRetryJitterMs);
        await new Promise((resolve) =>
          setTimeout(resolve, config.occRetryBaseMs + jitter)
        );
      }
    }

    throw new Error(
      `Failed to acquire SocialAPI budget reservation for ${consumer}`
    );
  },
});
