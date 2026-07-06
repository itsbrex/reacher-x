"use client";

import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_BEFORE_EDITOR, KEY_ENTER_COMMAND } from "lexical";

type SubmitOnEnterPluginProps = {
  disabled?: boolean;
  onSubmit?: () => void;
};

export function SubmitOnEnterPlugin({
  disabled = false,
  onSubmit,
}: SubmitOnEnterPluginProps) {
  const [editor] = useLexicalComposerContext();
  const onSubmitRef = useRef(onSubmit);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (
          !event ||
          disabledRef.current ||
          !onSubmitRef.current ||
          event.shiftKey ||
          event.isComposing
        ) {
          return false;
        }

        event.preventDefault();
        onSubmitRef.current();
        return true;
      },
      COMMAND_PRIORITY_BEFORE_EDITOR
    );
  }, [editor]);

  return null;
}
