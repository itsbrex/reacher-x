export type OutreachRecoveryStage =
  | "detecting_outbound"
  | "awaiting_connection"
  | "awaiting_response";

const MAX_BASELINE_IDS = 100;

export function parseRecoveryArtifactIds(value?: string): Set<string> {
  if (!value) return new Set();
  try {
    const parsed = JSON.parse(value) as unknown;
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : []
    );
  } catch {
    return new Set();
  }
}

export function serializeRecoveryArtifactIds(ids: readonly string[]): string {
  return JSON.stringify(Array.from(new Set(ids)).slice(0, MAX_BASELINE_IDS));
}

export function getNewRecoveryArtifactIds(
  currentIds: readonly string[],
  baselineIdsJson?: string
): string[] {
  const baseline = parseRecoveryArtifactIds(baselineIdsJson);
  return Array.from(new Set(currentIds)).filter((id) => !baseline.has(id));
}

export function getRecoveryNextCheckDelayMs(
  stage: OutreachRecoveryStage,
  attemptCount: number
): number {
  if (stage === "awaiting_connection") {
    // Unipile's new_relation webhook is primary and may arrive up to 8 hours
    // after acceptance. Keep profile checks sparse to avoid automation-like
    // polling patterns on LinkedIn.
    if (attemptCount < 1) return 8 * 60 * 60 * 1000;
    if (attemptCount < 3) return 12 * 60 * 60 * 1000;
    if (attemptCount < 7) return 24 * 60 * 60 * 1000;
    return 72 * 60 * 60 * 1000;
  }

  if (stage === "awaiting_response") {
    if (attemptCount < 4) return 5 * 60 * 1000;
    if (attemptCount < 12) return 15 * 60 * 1000;
    return 30 * 60 * 1000;
  }

  if (attemptCount < 2) return 15 * 1000;
  if (attemptCount < 5) return 30 * 1000;
  if (attemptCount < 10) return 60 * 1000;
  if (attemptCount < 20) return 5 * 60 * 1000;
  return 15 * 60 * 1000;
}
