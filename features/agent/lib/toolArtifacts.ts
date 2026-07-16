import {
  getAgentArtifactFromResult,
  getAgentArtifactSemanticKey,
  validateAgentArtifactEnvelope,
  type AgentArtifactEnvelope,
} from "@/shared/lib/json-render/agentArtifacts";

interface ArtifactBearingToolCall {
  toolCallId?: string;
  result?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getLegacyPlanSemanticKey(result: unknown): string | null {
  if (!isRecord(result) || !isRecord(result.plan)) {
    return null;
  }

  const planId = result.plan.id;
  return typeof planId === "string" && planId.length > 0
    ? `PlanPreviewCard:${planId}`
    : null;
}

export function getAgentArtifactsFromToolResult(
  result: unknown
): AgentArtifactEnvelope[] {
  if (!isRecord(result)) {
    return [];
  }

  const candidates = Array.isArray(result.artifacts) ? result.artifacts : [];
  const directArtifact = getAgentArtifactFromResult(result);
  const validatedArtifacts = [
    ...candidates
      .map((candidate) => validateAgentArtifactEnvelope(candidate))
      .filter(
        (artifact): artifact is AgentArtifactEnvelope => artifact !== null
      ),
    ...(directArtifact ? [directArtifact] : []),
  ];
  const seenSemanticKeys = new Set<string>();

  return validatedArtifacts.filter((artifact) => {
    const semanticKey = getAgentArtifactSemanticKey(artifact);
    if (!semanticKey) {
      return true;
    }
    if (seenSemanticKeys.has(semanticKey)) {
      return false;
    }
    seenSemanticKeys.add(semanticKey);
    return true;
  });
}

export function getToolResultArtifactSemanticKeys(result: unknown): string[] {
  const keys = getAgentArtifactsFromToolResult(result)
    .map((artifact) => getAgentArtifactSemanticKey(artifact))
    .filter((key): key is string => key !== null);
  const legacyPlanKey = getLegacyPlanSemanticKey(result);

  return [...new Set(legacyPlanKey ? [...keys, legacyPlanKey] : keys)];
}

export function getSupersededArtifactKeysByToolCallId(
  toolCalls: readonly ArtifactBearingToolCall[]
): ReadonlyMap<string, ReadonlySet<string>> {
  const lastToolIndexBySemanticKey = new Map<string, number>();

  toolCalls.forEach((toolCall, index) => {
    for (const semanticKey of getToolResultArtifactSemanticKeys(
      toolCall.result
    )) {
      lastToolIndexBySemanticKey.set(semanticKey, index);
    }
  });

  const supersededKeysByToolCallId = new Map<string, ReadonlySet<string>>();

  toolCalls.forEach((toolCall, index) => {
    if (!toolCall.toolCallId) {
      return;
    }

    const supersededKeys = getToolResultArtifactSemanticKeys(
      toolCall.result
    ).filter(
      (semanticKey) =>
        (lastToolIndexBySemanticKey.get(semanticKey) ?? index) > index
    );

    if (supersededKeys.length > 0) {
      supersededKeysByToolCallId.set(
        toolCall.toolCallId,
        new Set(supersededKeys)
      );
    }
  });

  return supersededKeysByToolCallId;
}
