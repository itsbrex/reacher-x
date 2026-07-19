// convex/lib/enrichmentPool.ts
// Workpool for throttling prospect enrichment workflows
// Prevents OCC errors by limiting concurrent enrichments

import { Workpool } from "@convex-dev/workpool";
import { components } from "../_generated/api";
import { getSystemRuntimeConfig } from "./runtimeConfigHelpers";

/**
 * Enrichment Workpool
 *
 * Limits concurrent enrichment workflows to prevent:
 * 1. OCC errors from rate limit table contention
 * 2. Downstream API spikes while the shared SocialAPI budget gate smooths egress
 *
 * Configuration:
 * - maxParallelism: ENRICHMENT_MAX_PARALLELISM (default 10)
 * - retryActionsByDefault: true - Auto-retry failed enrichments
 */
export function getEnrichmentPool() {
  const config = getSystemRuntimeConfig().workpools.enrichment;
  return new Workpool(components.enrichmentPool, {
    maxParallelism: config.maxParallelism,
    retryActionsByDefault: true,
    defaultRetryBehavior: {
      maxAttempts: config.maxAttempts,
      initialBackoffMs: config.initialBackoffMs,
      base: config.base,
    },
  });
}
