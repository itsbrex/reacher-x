"use client";

import { useCallback, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_LOW, PASTE_COMMAND } from "lexical";

interface MediaPastePluginProps {
  onMediaUpload?: (files: File[]) => void;
}

export function MediaPastePlugin({ onMediaUpload }: MediaPastePluginProps) {
  const [editor] = useLexicalComposerContext();

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      const files = Array.from(clipboardData.files);
      // Restrict to allowed MIME types only
      const allowed = new Set([
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
      ]);
      const mediaFiles = files.filter((file) =>
        allowed.has((file.type || "").toLowerCase())
      );

      if (mediaFiles.length === 0) return;

      event.preventDefault();

      // Always use the parent component to handle media uploads through MediaUploadSection
      // This ensures proper integration with the upload flow and prevents duplicate skeletons
      if (onMediaUpload) {
        onMediaUpload(mediaFiles);
      }
    },
    [onMediaUpload]
  );

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        handlePaste(event);
        return false; // Let other paste handlers run
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, handlePaste]);

  return null;
}
