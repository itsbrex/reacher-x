import { getUIMessageDisplayText } from "./uiMessageText";
import { isToolPart } from "./toolParts";

type AssistantMessageLike = {
  role?: string;
  status?: string;
  text?: string | null;
  parts?: Array<{ type?: string; [key: string]: unknown }> | null;
};

/**
 * A streamed assistant message can exist before it has any renderable content.
 * Treat those transport-only shells as placeholders so the UI can keep showing
 * a single stable pending row instead of two competing loading states.
 */
export function isAssistantPlaceholderMessage(
  message: AssistantMessageLike
): boolean {
  if (message.role !== "assistant") {
    return false;
  }

  if (message.status !== "pending" && message.status !== "streaming") {
    return false;
  }

  if (getUIMessageDisplayText(message).trim().length > 0) {
    return false;
  }

  return !(message.parts ?? []).some(isToolPart);
}
