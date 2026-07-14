const MODEL_FAILURE_PREFIX = "[QUALIFICATION_MODEL_EVALUATION_FAILED]";

export function formatQualificationModelFailure(args: {
  provider: string;
  model: string;
  attemptCount: number;
  message: string;
}): string {
  return `${MODEL_FAILURE_PREFIX} provider=${JSON.stringify(args.provider)} model=${JSON.stringify(args.model)} attempts=${args.attemptCount} message=${JSON.stringify(args.message)}`;
}

export function parseQualificationModelFailure(message: string): {
  provider: string;
  model?: string;
  attemptCount?: number;
  message: string;
} | null {
  if (!message.includes(MODEL_FAILURE_PREFIX)) return null;

  const provider = message.match(/provider=("(?:[^"\\]|\\.)*")/)?.[1];
  const model = message.match(/model=("(?:[^"\\]|\\.)*")/)?.[1];
  const attemptCount = Number(message.match(/attempts=(\d+)/)?.[1]);
  const originalMessage = message.match(/message=("(?:[^"\\]|\\.)*")/)?.[1];
  const parseJsonString = (value: string | undefined) => {
    if (!value) return undefined;
    try {
      return JSON.parse(value) as string;
    } catch {
      return undefined;
    }
  };

  return {
    provider: parseJsonString(provider) ?? "configured_llm_route",
    model: parseJsonString(model),
    attemptCount: Number.isFinite(attemptCount) ? attemptCount : undefined,
    message: parseJsonString(originalMessage) ?? message,
  };
}
