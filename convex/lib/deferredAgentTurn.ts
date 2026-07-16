import type { StopCondition, ToolSet } from "ai";

export type DeferredAgentExecution = {
  state: "deferred";
  continuationId: string;
};

export function createDeferredAgentExecution(
  continuationId: string
): DeferredAgentExecution {
  return {
    state: "deferred",
    continuationId,
  };
}

export function isDeferredAgentExecution(
  value: unknown
): value is DeferredAgentExecution {
  if (!value || typeof value !== "object") {
    return false;
  }

  const execution = value as Partial<DeferredAgentExecution>;
  return (
    execution.state === "deferred" &&
    typeof execution.continuationId === "string" &&
    execution.continuationId.length > 0
  );
}

export function getDeferredAgentExecution(
  toolOutput: unknown
): DeferredAgentExecution | null {
  if (!toolOutput || typeof toolOutput !== "object") {
    return null;
  }

  let value: unknown = toolOutput;
  if (
    "type" in toolOutput &&
    toolOutput.type === "json" &&
    "value" in toolOutput
  ) {
    value = toolOutput.value;
  }
  if (!value || typeof value !== "object" || !("execution" in value)) {
    return null;
  }

  return isDeferredAgentExecution(value.execution) ? value.execution : null;
}

export function stopOnDeferredAgentExecution<
  Tools extends ToolSet,
>(): StopCondition<Tools> {
  return ({ steps }) => {
    const lastStep = steps[steps.length - 1];
    return (
      lastStep?.toolResults.some((result) => {
        if (!result.output || typeof result.output !== "object") {
          return false;
        }

        return getDeferredAgentExecution(result.output) !== null;
      }) ?? false
    );
  };
}
