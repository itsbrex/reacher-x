export type AgentThreadInitializationMode =
  | "explicitThread"
  | "prospectDraft"
  | "setupBootstrap"
  | "workspaceDraft";

interface ResolveAgentThreadInitializationModeOptions {
  threadId: string | null;
  prospectId: string | null;
  shouldResolveSetupBootstrap: boolean;
}

export function resolveAgentThreadInitializationMode({
  threadId,
  prospectId,
  shouldResolveSetupBootstrap,
}: ResolveAgentThreadInitializationModeOptions): AgentThreadInitializationMode {
  if (threadId) {
    return "explicitThread";
  }

  if (prospectId) {
    return "prospectDraft";
  }

  if (shouldResolveSetupBootstrap) {
    return "setupBootstrap";
  }

  return "workspaceDraft";
}

interface ShouldSyncAgentThreadToRouteOptions {
  effectiveThreadId: string | null;
  routeThreadId: string | null;
  staleThreadId: string | null;
  isSetupRoute: boolean;
}

/**
 * Prevents a cached Agent page from restoring the thread that was active before
 * navigation to a fresh route. A newly generated thread still syncs normally
 * because its ID differs from the stale route thread.
 */
export function shouldSyncAgentThreadToRoute({
  effectiveThreadId,
  routeThreadId,
  staleThreadId,
  isSetupRoute,
}: ShouldSyncAgentThreadToRouteOptions): boolean {
  return Boolean(
    !isSetupRoute &&
    effectiveThreadId &&
    !routeThreadId &&
    effectiveThreadId !== staleThreadId
  );
}
