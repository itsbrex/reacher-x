// convex/lib/qualificationPool.ts
// Workpool for throttling prospect qualification workflows
// Prevents OCC errors by limiting concurrent qualifications

import { Workpool } from "@convex-dev/workpool";
import { components } from "../_generated/api";
import { getSystemRuntimeConfig } from "./runtimeConfigHelpers";

/**
 * Qualification Workpool
 *
 * Limits concurrent qualification workflows to prevent:
 * 1. OCC errors from rate limit table contention
 * 2. Downstream API spikes while the shared SocialAPI budget gate smooths egress
 *
 * Configuration:
 * - maxParallelism: QUALIFICATION_MAX_PARALLELISM (default 10)
 * - retryActionsByDefault: true - Auto-retry failed qualifications
 */
export function getQualificationPool() {
  const config = getSystemRuntimeConfig().workpools.qualification;
  return new Workpool(components.qualificationPool, {
    maxParallelism: config.maxParallelism,
    retryActionsByDefault: true,
    defaultRetryBehavior: {
      maxAttempts: config.maxAttempts,
      initialBackoffMs: config.initialBackoffMs,
      base: config.base,
    },
  });
}
