import { v } from "convex/values";
import { getCurrentUTCTimestamp } from "../shared/lib/utils/time/timeUtils";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./lib/functionBuilders";
import {
  getLinkdApiBudgetConfig,
  LINKDAPI_PROVIDER,
} from "./lib/linkdapiBudget";

const internalLinkdApiBudget = (internal as any).linkdapiBudget;

export const reserveLinkdApiBudgetSlotInternal = internalMutation({
  args: {
    consumer: v.string(),
  },
  handler: async (ctx, { consumer }) => {
    const config = getLinkdApiBudgetConfig();
    const now = getCurrentUTCTimestamp();
    const existing = await ctx.db
      .query("linkdapiBudgetState")
      .withIndex("by_provider", (q) => q.eq("provider", LINKDAPI_PROVIDER))
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
      await ctx.db.insert("linkdapiBudgetState", {
        provider: LINKDAPI_PROVIDER,
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

export const acquireLinkdApiBudgetInternal = internalAction({
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
    const config = getLinkdApiBudgetConfig();
    for (
      let attempt = 0;
      attempt < config.reservationMaxAttempts;
      attempt += 1
    ) {
      try {
        const reservation = await ctx.runMutation(
          internalLinkdApiBudget.reserveLinkdApiBudgetSlotInternal,
          { consumer }
        );

        if (reservation.waitMs > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, reservation.waitMs)
          );
        }

        return reservation;
      } catch (error) {
        if (attempt === config.reservationMaxAttempts - 1) {
          throw error;
        }

        const jitter = Math.floor(Math.random() * config.occRetryJitterMs);
        await new Promise((resolve) =>
          setTimeout(resolve, config.occRetryBaseMs + jitter)
        );
      }
    }

    throw new Error(
      `Failed to acquire LinkdAPI budget reservation for ${consumer}`
    );
  },
});
