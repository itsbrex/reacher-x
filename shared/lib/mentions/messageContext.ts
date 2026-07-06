import {
  normalizeMentionEntitySearchResult,
  type MentionEntitySearchResult,
} from "./mentionEntities";

const LEGACY_TAGGED_ENTITIES_HEADER =
  "Tagged entities (treat these as explicit references for this request):";

export type AgentMessagePromptTextSource = "user" | "synthetic";

export interface AgentMessageAttachmentReference {
  uploadId: string | null;
  fileName: string;
  mediaUrl: string | null;
}

export interface AgentMessageContextMetadata {
  version: 1;
  promptTextSource: AgentMessagePromptTextSource;
  taggedEntities: MentionEntitySearchResult[];
  attachments: AgentMessageAttachmentReference[];
}

function coerceString(value: unknown, fallback = "") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function coerceOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function splitLegacyLabelAndDetails(value: string) {
  const trimmedValue = value.trim();
  const detailsIndex = trimmedValue.lastIndexOf(" (");

  if (detailsIndex === -1 || !trimmedValue.endsWith(")")) {
    return {
      label: trimmedValue,
      details: "",
    };
  }

  return {
    label: trimmedValue.slice(0, detailsIndex).trim(),
    details: trimmedValue.slice(detailsIndex + 2, -1).trim(),
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractLegacyField(details: string, fieldName: string) {
  const match = new RegExp(
    `${escapeRegExp(fieldName)}:\\s*([^;\\)]+)`,
    "i"
  ).exec(details);
  return coerceOptionalString(match?.[1]);
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function parseLegacyTaggedEntityLine(line: string):
  | {
      entity: MentionEntitySearchResult;
      attachment: null;
    }
  | {
      entity: null;
      attachment: AgentMessageAttachmentReference;
    }
  | null {
  const normalizedLine = line.trim().replace(/^- /, "").trim();
  if (!normalizedLine) {
    return null;
  }

  if (normalizedLine.startsWith("Prospect:")) {
    const { label, details } = splitLegacyLabelAndDetails(
      normalizedLine.slice("Prospect:".length)
    );
    const prospectId = extractLegacyField(details, "prospectId");
    if (!label || !prospectId) {
      return null;
    }

    const workspaceId = extractLegacyField(details, "workspaceId");
    const handle = extractLegacyField(details, "handle");

    return {
      entity: {
        id: `prospect:${prospectId}`,
        entityId: prospectId,
        kind: "prospect",
        label,
        mentionText: label,
        secondaryLabel: handle ? `@${handle.replace(/^@/, "")}` : "Prospect",
        avatarUrl: null,
        verified: false,
        referenceText: normalizedLine,
        workspaceId: workspaceId ?? undefined,
        prospectId,
        handle: handle?.replace(/^@/, "") ?? undefined,
      },
      attachment: null,
    };
  }

  if (normalizedLine.startsWith("Plan:")) {
    const { label, details } = splitLegacyLabelAndDetails(
      normalizedLine.slice("Plan:".length)
    );
    const planId = extractLegacyField(details, "planId");
    if (!label || !planId) {
      return null;
    }

    const workspaceId = extractLegacyField(details, "workspaceId");
    const prospectId = extractLegacyField(details, "prospectId");
    const status = extractLegacyField(details, "status");

    return {
      entity: {
        id: `plan:${planId}`,
        entityId: planId,
        kind: "plan",
        label,
        mentionText: label,
        secondaryLabel: status ? `${status} plan` : "Plan",
        avatarUrl: null,
        verified: false,
        referenceText: normalizedLine,
        workspaceId: workspaceId ?? undefined,
        prospectId: prospectId ?? undefined,
        planId,
      },
      attachment: null,
    };
  }

  if (normalizedLine.startsWith("Task:")) {
    const { label, details } = splitLegacyLabelAndDetails(
      normalizedLine.slice("Task:".length)
    );
    const taskId = extractLegacyField(details, "taskId");
    if (!label || !taskId) {
      return null;
    }

    const workspaceId = extractLegacyField(details, "workspaceId");
    const prospectId = extractLegacyField(details, "prospectId");
    const planId = extractLegacyField(details, "planId");
    const type = extractLegacyField(details, "type");

    return {
      entity: {
        id: `task:${taskId}`,
        entityId: taskId,
        kind: "task",
        label,
        mentionText: label,
        secondaryLabel: type ? `${type} task` : "Task",
        avatarUrl: null,
        verified: false,
        referenceText: normalizedLine,
        workspaceId: workspaceId ?? undefined,
        prospectId: prospectId ?? undefined,
        planId: planId ?? undefined,
        taskId,
      },
      attachment: null,
    };
  }

  if (normalizedLine.startsWith("Post:")) {
    const { label, details } = splitLegacyLabelAndDetails(
      normalizedLine.slice("Post:".length)
    );
    const postId = extractLegacyField(details, "postId");
    if (!label || !postId) {
      return null;
    }

    const workspaceId = extractLegacyField(details, "workspaceId");
    const prospectId = extractLegacyField(details, "prospectId");
    const postUrl = extractLegacyField(details, "url");
    const postPlatform = extractLegacyField(details, "platform");

    return {
      entity: {
        id: `post:${postPlatform ?? "unknown"}:${postId}`,
        entityId: postId,
        kind: "post",
        label,
        mentionText: `Post: ${label}`,
        secondaryLabel:
          postPlatform === "linkedin"
            ? "LinkedIn post"
            : postPlatform === "twitter"
              ? "X post"
              : "Post",
        avatarUrl: null,
        verified: false,
        referenceText: normalizedLine,
        workspaceId: workspaceId ?? undefined,
        prospectId: prospectId ?? undefined,
        postId,
        postUrl: postUrl ?? undefined,
        postPlatform:
          postPlatform === "linkedin" || postPlatform === "twitter"
            ? postPlatform
            : undefined,
      },
      attachment: null,
    };
  }

  if (normalizedLine.startsWith("Attachment:")) {
    const { label, details } = splitLegacyLabelAndDetails(
      normalizedLine.slice("Attachment:".length)
    );
    const mediaUrl = looksLikeUrl(details) ? details : null;

    if (!label || !mediaUrl) {
      return null;
    }

    return {
      entity: null,
      attachment: {
        uploadId: null,
        fileName: label,
        mediaUrl,
      },
    };
  }

  return null;
}

export function normalizeAgentMessageAttachmentReference(
  value: unknown
): AgentMessageAttachmentReference | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const attachment = value as {
    uploadId?: unknown;
    fileName?: unknown;
    mediaUrl?: unknown;
  };
  const fileName = coerceString(attachment.fileName);
  const uploadId = coerceOptionalString(attachment.uploadId);
  const mediaUrl = coerceOptionalString(attachment.mediaUrl);

  if (!fileName || (!uploadId && !mediaUrl)) {
    return null;
  }

  return {
    uploadId,
    fileName,
    mediaUrl,
  };
}

function dedupeMentionEntities(
  taggedEntities: MentionEntitySearchResult[]
): MentionEntitySearchResult[] {
  const deduped: MentionEntitySearchResult[] = [];
  const seen = new Set<string>();

  for (const entity of taggedEntities) {
    const key = entity.id || `${entity.kind}:${entity.entityId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(entity);
  }

  return deduped;
}

function dedupeAttachments(
  attachments: AgentMessageAttachmentReference[]
): AgentMessageAttachmentReference[] {
  const deduped: AgentMessageAttachmentReference[] = [];
  const seen = new Set<string>();

  for (const attachment of attachments) {
    const key =
      attachment.uploadId ?? attachment.mediaUrl ?? attachment.fileName;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(attachment);
  }

  return deduped;
}

export function normalizeAgentMessageContextMetadata(
  value: unknown
): AgentMessageContextMetadata | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const metadata = value as {
    version?: unknown;
    promptTextSource?: unknown;
    taggedEntities?: unknown[];
    attachments?: unknown[];
  };
  const promptTextSource =
    metadata.promptTextSource === "synthetic" ? "synthetic" : "user";
  const taggedEntities = Array.isArray(metadata.taggedEntities)
    ? dedupeMentionEntities(
        metadata.taggedEntities
          .map((entity) =>
            normalizeMentionEntitySearchResult(
              entity as MentionEntitySearchResult
            )
          )
          .filter(
            (entity): entity is MentionEntitySearchResult => entity !== null
          )
      )
    : [];
  const attachments = Array.isArray(metadata.attachments)
    ? dedupeAttachments(
        metadata.attachments
          .map(normalizeAgentMessageAttachmentReference)
          .filter(
            (attachment): attachment is AgentMessageAttachmentReference =>
              attachment !== null
          )
      )
    : [];

  if (
    taggedEntities.length === 0 &&
    attachments.length === 0 &&
    metadata.version !== 1
  ) {
    return null;
  }

  return {
    version: 1,
    promptTextSource,
    taggedEntities,
    attachments,
  };
}

export function buildAgentMessageContextMetadata(args: {
  promptTextSource: AgentMessagePromptTextSource;
  taggedEntities?: MentionEntitySearchResult[];
  attachments?: AgentMessageAttachmentReference[];
}): AgentMessageContextMetadata | null {
  const taggedEntities = dedupeMentionEntities(
    (args.taggedEntities ?? [])
      .map((entity) => normalizeMentionEntitySearchResult(entity))
      .filter((entity): entity is MentionEntitySearchResult => entity !== null)
  );
  const attachments = dedupeAttachments(
    (args.attachments ?? [])
      .map(normalizeAgentMessageAttachmentReference)
      .filter(
        (attachment): attachment is AgentMessageAttachmentReference =>
          attachment !== null
      )
  );

  if (taggedEntities.length === 0 && attachments.length === 0) {
    return null;
  }

  return {
    version: 1,
    promptTextSource: args.promptTextSource,
    taggedEntities,
    attachments,
  };
}

export function buildAgentMessageStorageText(args: {
  input: string;
  metadata?: AgentMessageContextMetadata | null;
}) {
  const trimmedInput = args.input.trim();

  if (trimmedInput) {
    return {
      prompt: trimmedInput,
      promptTextSource: "user" as const,
    };
  }

  const metadata = normalizeAgentMessageContextMetadata(args.metadata);
  if (!metadata) {
    return {
      prompt: "",
      promptTextSource: "user" as const,
    };
  }

  if (metadata.attachments.length > 0) {
    if (metadata.attachments.length === 1) {
      return {
        prompt: `Attached ${metadata.attachments[0].fileName}`,
        promptTextSource: "synthetic" as const,
      };
    }

    return {
      prompt: `Attached ${metadata.attachments.length} files`,
      promptTextSource: "synthetic" as const,
    };
  }

  if (metadata.taggedEntities.length > 0) {
    if (metadata.taggedEntities.length === 1) {
      return {
        prompt: `Tagged ${metadata.taggedEntities[0].label}`,
        promptTextSource: "synthetic" as const,
      };
    }

    return {
      prompt: `Tagged ${metadata.taggedEntities[0].label} and ${metadata.taggedEntities.length - 1} more`,
      promptTextSource: "synthetic" as const,
    };
  }

  return {
    prompt: "",
    promptTextSource: "user" as const,
  };
}

export function parseLegacyAgentMessageContent(value: string): {
  displayText: string;
  metadata: AgentMessageContextMetadata;
} | null {
  const normalizedValue = value.replace(/\r\n/g, "\n");
  const headerIndex = normalizedValue.indexOf(LEGACY_TAGGED_ENTITIES_HEADER);

  if (headerIndex === -1) {
    return null;
  }

  const displayText = normalizedValue.slice(0, headerIndex).trim();
  const taggedSection = normalizedValue
    .slice(headerIndex + LEGACY_TAGGED_ENTITIES_HEADER.length)
    .trim();

  if (!taggedSection) {
    return null;
  }

  const taggedEntities: MentionEntitySearchResult[] = [];
  const attachments: AgentMessageAttachmentReference[] = [];

  for (const line of taggedSection.split("\n")) {
    const parsedLine = parseLegacyTaggedEntityLine(line);
    if (!parsedLine) {
      continue;
    }

    if (parsedLine.entity) {
      taggedEntities.push(parsedLine.entity);
    }
    if (parsedLine.attachment) {
      attachments.push(parsedLine.attachment);
    }
  }

  const metadata = buildAgentMessageContextMetadata({
    promptTextSource: displayText ? "user" : "synthetic",
    taggedEntities,
    attachments,
  });

  if (!metadata) {
    return null;
  }

  return {
    displayText,
    metadata,
  };
}
