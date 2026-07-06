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
