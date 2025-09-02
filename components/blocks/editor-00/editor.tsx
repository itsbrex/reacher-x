"use client";

import * as React from "react";
import {
  InitialConfigType,
  LexicalComposer,
} from "@lexical/react/LexicalComposer";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { EditorState, SerializedEditorState } from "lexical";

import { editorTheme } from "@/components/editor/themes/editor-theme";
import { TooltipProvider } from "@/shared/ui/components/Tooltip";

import { nodes } from "./nodes";
import { Plugins } from "./plugins";

const editorConfig: InitialConfigType = {
  namespace: "Editor",
  theme: editorTheme,
  nodes,
  onError: (error: Error) => {
    console.error(error);
  },
};

export function Editor({
  editorState,
  editorSerializedState,
  onChange,
  onSerializedChange,
  extraPlugins,
}: {
  editorState?: EditorState;
  editorSerializedState?: SerializedEditorState;
  onChange?: (editorState: EditorState) => void;
  onSerializedChange?: (editorSerializedState: SerializedEditorState) => void;
  extraPlugins?: React.ReactNode;
}) {
  // Build initialConfig once to avoid re-creating the editor on every render.
  const initialConfig = React.useMemo<InitialConfigType>(() => {
    const base: InitialConfigType = { ...editorConfig };
    if (editorState) {
      // If a fully constructed EditorState was provided at mount, use it once
      return { ...base, editorState };
    }
    if (editorSerializedState) {
      // If a serialized state was provided at mount, use it once
      return {
        ...base,
        editorState: JSON.stringify(editorSerializedState),
      };
    }
    return base;
    // Intentionally only run once on mount. Subsequent prop changes should not
    // tear down and recreate the editor instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-hidden bg-background">
      <LexicalComposer initialConfig={initialConfig}>
        <TooltipProvider>
          <Plugins />
          {extraPlugins}

          <OnChangePlugin
            ignoreSelectionChange={true}
            onChange={(editorState) => {
              onChange?.(editorState);
              onSerializedChange?.(editorState.toJSON());
            }}
          />
        </TooltipProvider>
      </LexicalComposer>
    </div>
  );
}
