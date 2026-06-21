// convex/lib/retrier.ts
// ActionRetrier instance for reliable external API calls with automatic retry

import {
  ActionRetrier,
  type RunId,
  type RunOptions,
} from "@convex-dev/action-retrier";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionVisibility,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import { components } from "../_generated/api";

/**
 * Shared ActionRetrier instance for all external API calls.
 *
 * Configuration:
 * - initialBackoffMs: 1000ms (1 second initial delay after failure)
 * - base: 2 (exponential backoff: 1s → 2s → 4s)
 * - maxFailures: 3 (maximum retry attempts before giving up)
 *
 * Usage:
 * ```typescript
 * import { retrier } from "./lib/retrier";
 *
 * // In an action or mutation:
 * const runId = await retrier.run(ctx, internal.myModule.myInternalAction, { arg: "value" });
 * ```
 */
export const retrier = new ActionRetrier(components.actionRetrier, {
  initialBackoffMs: 1000,
  base: 2,
  maxFailures: 3,
});

type CompatibleRetrierMutationCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runMutation"
>;
type CompatibleRetrierQueryCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runQuery"
>;
type RetrierMutationRunner =
  GenericMutationCtx<GenericDataModel>["runMutation"];
type RetrierQueryRunner = GenericQueryCtx<GenericDataModel>["runQuery"];

function createRetrierMutationCtx(ctx: CompatibleRetrierMutationCtx): {
  runMutation: RetrierMutationRunner;
} {
  const runMutation: RetrierMutationRunner = ((mutation, ...argsAndOptions) => {
    const [args] = argsAndOptions;
    return args === undefined
      ? ctx.runMutation(mutation as never)
      : ctx.runMutation(mutation as never, args as never);
  }) as RetrierMutationRunner;

  return { runMutation };
}

function createRetrierQueryCtx(ctx: CompatibleRetrierQueryCtx): {
  runQuery: RetrierQueryRunner;
} {
  const runQuery: RetrierQueryRunner = ((query, ...argsAndOptions) => {
    const [args] = argsAndOptions;
    return args === undefined
      ? ctx.runQuery(query as never)
      : ctx.runQuery(query as never, args as never);
  }) as RetrierQueryRunner;

  return { runQuery };
}

/**
 * Convex 1.41 widened mutation/query helper signatures to support options,
 * while action contexts still expose the narrower runQuery/runMutation shape.
 * This adapter keeps ActionRetrier call sites compatible without changing
 * runtime behavior.
 */
export async function runRetriedAction<
  F extends FunctionReference<"action", FunctionVisibility>,
>(
  ctx: CompatibleRetrierMutationCtx,
  reference: F,
  args?: FunctionArgs<F>,
  options?: RunOptions
): Promise<RunId> {
  return retrier.run(createRetrierMutationCtx(ctx), reference, args, options);
}

export async function getRetriedActionStatus(
  ctx: CompatibleRetrierQueryCtx,
  runId: RunId
) {
  return retrier.status(createRetrierQueryCtx(ctx), runId);
}
