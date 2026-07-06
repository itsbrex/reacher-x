interface PendingTurnPhaseState {
  id: string;
  phase: string;
}

/**
 * Preserve object identity when a pending turn is already in the requested
 * phase so effects that depend on the object do not retrigger indefinitely.
 */
export function updatePendingTurnPhase<T extends PendingTurnPhaseState>(
  current: T | null,
  pendingTurnId: string,
  nextPhase: T["phase"]
): T | null {
  if (current === null || current.id !== pendingTurnId) {
    return current;
  }

  if (current.phase === nextPhase) {
    return current;
  }

  if (current.phase === "stopping" && nextPhase !== "stopping") {
    return current;
  }

  return {
    ...current,
    phase: nextPhase,
  };
}
