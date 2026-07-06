import type { MentionEntitySearchResult } from "../../../shared/lib/mentions/mentionEntities";
import {
  buildAgentMessageContextMetadata,
  buildAgentMessageStorageText,
  type AgentMessageContextMetadata,
} from "../../../shared/lib/mentions/messageContext";

export interface AgentComposerAttachmentReference {
  uploadId: string | null;
  fileName: string;
  mediaUrl: string | null;
}

export interface AgentComposerSubmission {
  prompt: string;
  metadata: AgentMessageContextMetadata | null;
}

export function buildAgentComposerSubmission(args: {
  input: string;
  taggedEntities?: MentionEntitySearchResult[];
  attachments?: AgentComposerAttachmentReference[];
}) {
  const normalizedAttachments = (args.attachments ?? []).filter(
    (attachment) => attachment.uploadId || attachment.mediaUrl
  );
  const metadata = buildAgentMessageContextMetadata({
    promptTextSource: "user",
    taggedEntities: args.taggedEntities,
    attachments: normalizedAttachments,
  });
  const { prompt, promptTextSource } = buildAgentMessageStorageText({
    input: args.input,
    metadata,
  });
  const normalizedMetadata = metadata
    ? {
        ...metadata,
        promptTextSource,
      }
    : null;

  if (!prompt && !normalizedMetadata) {
    return null;
  }

  return {
    prompt,
    metadata: normalizedMetadata,
  };
}
