export type AttachmentMediaKind = "image" | "gif" | "video" | null;

function normalizeMimeType(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizePathLikeValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function inferAttachmentMediaKind(args: {
  mimeType?: string | null;
  url?: string | null;
}): AttachmentMediaKind {
  const mimeType = normalizeMimeType(args.mimeType);
  if (mimeType === "image/gif") {
    return "gif";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  const pathLikeValue = normalizePathLikeValue(args.url);
  if (/\.(gif)(?:$|[?#])/.test(pathLikeValue)) {
    return "gif";
  }
  if (/\.(mp4|mov|webm|m4v)(?:$|[?#])/.test(pathLikeValue)) {
    return "video";
  }
  if (/\.(png|jpe?g|webp|avif|bmp|svg)(?:$|[?#])/.test(pathLikeValue)) {
    return "image";
  }

  return null;
}

export function isVisionAttachmentMediaKind(
  kind: AttachmentMediaKind
): kind is "image" | "gif" {
  return kind === "image" || kind === "gif";
}
