interface AgentMessageScrollCandidate {
  key: string;
  role: string;
}

/**
 * Returns the only persisted user message that may anchor the transcript.
 * Historical user turns must not remain anchors because replacing a local
 * pending row can otherwise make the scroller select an older turn.
 */
export function getLatestUserMessageScrollAnchorKey(
  messages: readonly AgentMessageScrollCandidate[]
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "user") {
      return message.key;
    }
  }

  return null;
}
