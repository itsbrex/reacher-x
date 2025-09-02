"use client";

import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";

export type FormattingState = {
  isBold: boolean;
  isItalic: boolean;
};

export type ComposerEditorAPI = {
  toggleBold: () => void;
  toggleItalic: () => void;
};

export function ToolbarBridgePlugin({
  onReady,
  onFormattingChange,
}: {
  onReady?: (api: ComposerEditorAPI) => void;
  onFormattingChange?: (state: FormattingState) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const hasReportedReadyRef = useRef(false);
  const lastFormattingRef = useRef<FormattingState>({
    isBold: false,
    isItalic: false,
  });

  useEffect(() => {
    if (!hasReportedReadyRef.current) {
      onReady?.({
        toggleBold: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"),
        toggleItalic: () =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic"),
      });
      hasReportedReadyRef.current = true;
    }

    const emitFormattingIfChanged = (next: FormattingState) => {
      const prev = lastFormattingRef.current;
      if (prev.isBold !== next.isBold || prev.isItalic !== next.isItalic) {
        lastFormattingRef.current = next;
        onFormattingChange?.(next);
      }
    };

    // Emit initial state
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        emitFormattingIfChanged({
          isBold: selection.hasFormat("bold"),
          isItalic: selection.hasFormat("italic"),
        });
      } else {
        emitFormattingIfChanged({ isBold: false, isItalic: false });
      }
    });

    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            emitFormattingIfChanged({
              isBold: selection.hasFormat("bold"),
              isItalic: selection.hasFormat("italic"),
            });
          } else {
            emitFormattingIfChanged({ isBold: false, isItalic: false });
          }
        });
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, onReady, onFormattingChange]);

  return null;
}
