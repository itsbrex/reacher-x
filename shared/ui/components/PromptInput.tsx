"use client";

import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react";
import { Textarea } from "@/shared/ui/components/TextArea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/components/Tooltip";
import { cn } from "@/shared/lib/utils";
import { getTextareaCaretCoordinates } from "@/shared/lib/autocomplete/getTextareaCaretCoordinates";
import {
  getInlineAutocompleteInsertionText,
  type InlineAutocompleteContext,
} from "@/shared/lib/autocomplete/inlineAutocomplete";
import { useInlineAutocomplete } from "@/shared/hooks/useInlineAutocomplete";
import type { MentionEntitySearchResult } from "@/shared/lib/mentions/mentionEntities";
import { MentionEntityMenu } from "@/shared/ui/components/mentions/MentionEntityMenu";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type PromptInputContextType = {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

const PromptInputContext = createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
  textareaRef: React.createRef<HTMLTextAreaElement>(),
});

function usePromptInput() {
  return useContext(PromptInputContext);
}

export function insertTextareaTextWithUndo(args: {
  textarea: HTMLTextAreaElement;
  text: string;
  selectionStart: number;
  selectionEnd: number;
}) {
  const { textarea, text, selectionStart, selectionEnd } = args;
  const nextSelection = selectionStart + text.length;
  const view = textarea.ownerDocument.defaultView;
  let insertedWithNativeUndo = false;

  textarea.focus();
  textarea.setSelectionRange(selectionStart, selectionEnd);

  if (typeof textarea.ownerDocument.execCommand === "function") {
    try {
      insertedWithNativeUndo = textarea.ownerDocument.execCommand(
        "insertText",
        false,
        text
      );
    } catch {
      insertedWithNativeUndo = false;
    }
  }

  if (!insertedWithNativeUndo) {
    textarea.setRangeText(text, selectionStart, selectionEnd, "end");

    const inputEvent = view?.InputEvent
      ? new view.InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: text,
        })
      : new Event("input", { bubbles: true });

    textarea.dispatchEvent(inputEvent);
  }

  const normalizedSelection = (() => {
    const expectedSelection = nextSelection;
    const actualSelectionStart = textarea.selectionStart ?? expectedSelection;
    const actualSelectionEnd = textarea.selectionEnd ?? expectedSelection;
    const insertedText = textarea.value.slice(
      selectionStart,
      expectedSelection
    );

    if (
      actualSelectionStart === actualSelectionEnd &&
      actualSelectionStart < expectedSelection &&
      insertedText === text
    ) {
      textarea.setSelectionRange(expectedSelection, expectedSelection);
      return expectedSelection;
    }

    return actualSelectionStart;
  })();

  return {
    value: textarea.value,
    selectionStart: normalizedSelection,
    selectionEnd: textarea.selectionEnd ?? normalizedSelection,
  };
}

const PROMPT_INPUT_MENTION_REGEX = /(^|\s|\()@([^\s@()]*)$/;

function getPromptInputMentionMatch(args: {
  beforeCursor: string;
  selectionCollapsed: boolean;
}) {
  if (!args.selectionCollapsed) {
    return null;
  }

  const match = PROMPT_INPUT_MENTION_REGEX.exec(args.beforeCursor);
  if (!match) {
    return null;
  }

  return {
    query: match[2] ?? "",
    replaceStart: match.index + match[1].length,
    replaceEnd: args.beforeCursor.length,
  };
}

export type PromptInputProps = {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
} & React.ComponentProps<"div">;

function PromptInput({
  className,
  isLoading = false,
  maxHeight = 240,
  value,
  onValueChange,
  onSubmit,
  children,
  disabled = false,
  onClick,
  ...props
}: PromptInputProps) {
  const [internalValue, setInternalValue] = useState(value || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentValue = value ?? internalValue;

  const handleChange = useCallback(
    (newValue: string) => {
      setInternalValue((current) =>
        current === newValue ? current : newValue
      );
      onValueChange?.(newValue);
    },
    [onValueChange]
  );

  const handleClick: React.MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (!disabled) textareaRef.current?.focus();
      onClick?.(e);
    },
    [disabled, onClick]
  );

  const contextValue = useMemo(
    () => ({
      isLoading,
      value: currentValue,
      setValue: onValueChange ?? handleChange,
      maxHeight,
      onSubmit,
      disabled,
      textareaRef,
    }),
    [
      currentValue,
      disabled,
      handleChange,
      isLoading,
      maxHeight,
      onSubmit,
      onValueChange,
    ]
  );

  return (
    <TooltipProvider>
      <PromptInputContext.Provider value={contextValue}>
        <div
          onClick={handleClick}
          className={cn(
            "border-input bg-background ring-offset-background focus-within:ring-ring cursor-text rounded-xl border p-2 transition-shadow focus-within:ring-2 focus-within:ring-offset-2 focus-within:outline-hidden",
            disabled && "cursor-not-allowed opacity-60",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </PromptInputContext.Provider>
    </TooltipProvider>
  );
}

export type PromptInputTextareaProps = {
  disableAutosize?: boolean;
  textareaElementRef?: React.Ref<HTMLTextAreaElement>;
  inlineAutocompleteContext?: InlineAutocompleteContext;
  mentionAutocomplete?: {
    enabled?: boolean;
    items: MentionEntitySearchResult[];
    loading?: boolean;
    onQueryChange: (query: string | null) => void;
    onSelectItem?: (item: MentionEntitySearchResult) => void;
    getReplacementText?: (
      item: MentionEntitySearchResult,
      context: {
        currentValue: string;
        replaceStart: number;
        replaceEnd: number;
      }
    ) => string;
  };
} & React.ComponentProps<typeof Textarea>;

function PromptInputTextarea({
  className,
  onKeyDown,
  disableAutosize = false,
  textareaElementRef,
  inlineAutocompleteContext,
  mentionAutocomplete,
  ...props
}: PromptInputTextareaProps) {
  const { value, setValue, maxHeight, onSubmit, disabled, textareaRef } =
    usePromptInput();
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const mentionListboxId = useId();
  const pendingAutocompleteValueRef = useRef<string | null>(null);
  const suppressMentionAutocompleteRef = useRef(false);
  const mentionCloseSuppressionTimeoutRef = useRef<number | null>(null);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties | null>(
    null
  );
  const hasTextareaFocus =
    isFocused ||
    (typeof document !== "undefined" &&
      textareaRef.current === document.activeElement);
  const activeMentionMatch = useMemo(() => {
    if (
      !mentionAutocomplete ||
      mentionAutocomplete.enabled === false ||
      disabled ||
      isComposing ||
      suppressMentionAutocompleteRef.current ||
      !hasTextareaFocus
    ) {
      return null;
    }

    return getPromptInputMentionMatch({
      beforeCursor: value.slice(0, selectionStart),
      selectionCollapsed: selectionStart === selectionEnd,
    });
  }, [
    disabled,
    isComposing,
    hasTextareaFocus,
    mentionAutocomplete,
    selectionEnd,
    selectionStart,
    value,
  ]);
  const autocompleteEnabled =
    Boolean(inlineAutocompleteContext) &&
    !disabled &&
    !isComposing &&
    hasTextareaFocus &&
    inlineAutocompleteContext?.enabled !== false &&
    activeMentionMatch === null;
  const request = useMemo(
    () =>
      autocompleteEnabled &&
      inlineAutocompleteContext &&
      selectionStart === selectionEnd
        ? {
            ...inlineAutocompleteContext,
            surface: "prompt_input" as const,
            beforeCursor: value.slice(0, selectionStart),
            afterCursor: value.slice(selectionStart),
          }
        : null,
    [
      autocompleteEnabled,
      inlineAutocompleteContext,
      selectionEnd,
      selectionStart,
      value,
    ]
  );
  const { suggestion, dismissSuggestion, recordAccepted, isLoading } =
    useInlineAutocomplete({
      request,
      enabled: autocompleteEnabled,
    });
  const mentionMenuOpen =
    Boolean(activeMentionMatch && mentionAutocomplete) &&
    hasTextareaFocus &&
    !isComposing;
  const mentionMenuWidth = useMemo(() => {
    const el = textareaRef.current;

    if (!el || !mentionMenuOpen || !activeMentionMatch) {
      return 280;
    }

    const caret = getTextareaCaretCoordinates(el, selectionStart);
    const computed = window.getComputedStyle(el);
    const paddingRight = Number.parseFloat(computed.paddingRight) || 0;

    return Math.min(
      360,
      Math.max(240, el.clientWidth - caret.left - paddingRight)
    );
  }, [activeMentionMatch, mentionMenuOpen, selectionStart, textareaRef]);
  const mentionPositionReference = useMemo(() => {
    const el = textareaRef.current;

    if (!el || !mentionMenuOpen || !activeMentionMatch) {
      return null;
    }

    return {
      contextElement: el,
      getBoundingClientRect() {
        const caret = getTextareaCaretCoordinates(el, selectionStart);
        const rect = el.getBoundingClientRect();
        const x = rect.left + caret.left;
        const y = rect.top + caret.top + caret.lineHeight;

        return {
          width: 0,
          height: 0,
          x,
          y,
          top: y,
          left: x,
          right: x,
          bottom: y,
        };
      },
    };
  }, [activeMentionMatch, mentionMenuOpen, selectionStart, textareaRef]);
  const {
    refs: mentionMenuFloatingRefs,
    floatingStyles: mentionMenuFloatingStyles,
    update: updateMentionMenuPosition,
  } = useFloating({
    open: mentionMenuOpen,
    placement: "bottom-start",
    strategy: "fixed",
    middleware: [
      offset(8),
      flip({
        padding: 12,
        fallbackPlacements: ["top-start", "bottom-end", "top-end"],
      }),
      shift({ padding: 12 }),
      size(
        {
          padding: 12,
          apply({ availableHeight, elements }) {
            const nextMaxHeight = Math.max(120, Math.min(availableHeight, 288));
            elements.floating.style.width = `${mentionMenuWidth}px`;
            elements.floating.style.maxWidth = `${Math.max(
              220,
              window.innerWidth - 24
            )}px`;
            elements.floating.style.setProperty(
              "--prompt-input-mention-menu-max-height",
              `${nextMaxHeight}px`
            );
          },
        },
        [mentionMenuWidth]
      ),
    ],
    whileElementsMounted: mentionPositionReference ? autoUpdate : undefined,
  });
  useLayoutEffect(() => {
    if (!mentionPositionReference) {
      return;
    }

    mentionMenuFloatingRefs.setPositionReference(mentionPositionReference);
  }, [mentionMenuFloatingRefs, mentionPositionReference]);

  const mentionQueryChangeHandler = mentionAutocomplete?.onQueryChange;
  useEffect(() => {
    mentionQueryChangeHandler?.(activeMentionMatch?.query ?? null);
  }, [activeMentionMatch?.query, mentionQueryChangeHandler]);
  useEffect(
    () => () => {
      if (mentionCloseSuppressionTimeoutRef.current !== null) {
        window.clearTimeout(mentionCloseSuppressionTimeoutRef.current);
      }
    },
    []
  );
  const resolvedMentionSelectedIndex = useMemo(() => {
    const itemCount = mentionAutocomplete?.items.length ?? 0;
    if (!mentionMenuOpen || itemCount === 0) {
      return 0;
    }

    return mentionSelectedIndex >= itemCount ? 0 : mentionSelectedIndex;
  }, [
    mentionAutocomplete?.items.length,
    mentionMenuOpen,
    mentionSelectedIndex,
  ]);
  const mentionItems = mentionAutocomplete?.items ?? [];
  const selectedMentionItem =
    mentionItems[resolvedMentionSelectedIndex] ?? mentionItems[0] ?? null;
  const getMentionOptionId = useCallback(
    (item: MentionEntitySearchResult, index: number) =>
      `${mentionListboxId}-option-${item.id}-${index}`,
    [mentionListboxId]
  );
  const activeMentionOptionId =
    mentionMenuOpen && selectedMentionItem
      ? getMentionOptionId(
          selectedMentionItem,
          resolvedMentionSelectedIndex < mentionItems.length
            ? resolvedMentionSelectedIndex
            : 0
        )
      : undefined;

  const adjustHeight = useCallback(
    (el: HTMLTextAreaElement | null) => {
      if (!el || disableAutosize) return;

      el.style.height = "auto";

      if (typeof maxHeight === "number") {
        el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
      } else {
        el.style.height = `min(${el.scrollHeight}px, ${maxHeight})`;
      }
    },
    [disableAutosize, maxHeight]
  );

  const handleRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      if (textareaRef.current === el) {
        adjustHeight(el);
        return;
      }

      textareaRef.current = el;
      if (typeof textareaElementRef === "function") {
        textareaElementRef(el);
      } else if (textareaElementRef) {
        textareaElementRef.current = el;
      }
      adjustHeight(el);
      if (el) {
        const nextSelectionStart = el.selectionStart ?? 0;
        const nextSelectionEnd = el.selectionEnd ?? 0;

        setSelectionStart((current) =>
          current === nextSelectionStart ? current : nextSelectionStart
        );
        setSelectionEnd((current) =>
          current === nextSelectionEnd ? current : nextSelectionEnd
        );
      }
    },
    [adjustHeight, textareaElementRef, textareaRef]
  );

  useLayoutEffect(() => {
    if (!textareaRef.current || disableAutosize) return;

    const el = textareaRef.current;
    el.style.height = "auto";

    if (typeof maxHeight === "number") {
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    } else {
      el.style.height = `min(${el.scrollHeight}px, ${maxHeight})`;
    }
  }, [value, maxHeight, disableAutosize, textareaRef]);

  useLayoutEffect(() => {
    const el = textareaRef.current;

    if (
      !el ||
      !suggestion ||
      !hasTextareaFocus ||
      selectionStart !== selectionEnd
    ) {
      setOverlayStyle((current) => (current === null ? current : null));
      return;
    }

    const caret = getTextareaCaretCoordinates(el, selectionStart);
    const computed = window.getComputedStyle(el);
    const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
    const nextOverlayStyle: React.CSSProperties = {
      top: caret.top,
      left: caret.left,
      maxWidth: Math.max(64, el.clientWidth - caret.left - paddingRight - 4),
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
    };

    setOverlayStyle((current) => {
      if (
        current &&
        current.top === nextOverlayStyle.top &&
        current.left === nextOverlayStyle.left &&
        current.maxWidth === nextOverlayStyle.maxWidth &&
        current.fontFamily === nextOverlayStyle.fontFamily &&
        current.fontSize === nextOverlayStyle.fontSize &&
        current.fontWeight === nextOverlayStyle.fontWeight &&
        current.lineHeight === nextOverlayStyle.lineHeight &&
        current.letterSpacing === nextOverlayStyle.letterSpacing
      ) {
        return current;
      }

      return nextOverlayStyle;
    });
  }, [
    hasTextareaFocus,
    selectionEnd,
    selectionStart,
    suggestion,
    value,
    textareaRef,
  ]);

  useLayoutEffect(() => {
    if (!mentionMenuOpen) {
      return;
    }

    void updateMentionMenuPosition();
  }, [
    mentionMenuOpen,
    mentionMenuWidth,
    selectionEnd,
    selectionStart,
    updateMentionMenuPosition,
    value,
    mentionAutocomplete?.items.length,
    mentionAutocomplete?.loading,
  ]);

  const syncSelection = useCallback(
    (target?: HTMLTextAreaElement | null) => {
      const el = target ?? textareaRef.current;
      if (!el) {
        return;
      }

      const nextSelectionStart = el.selectionStart ?? 0;
      const nextSelectionEnd = el.selectionEnd ?? 0;

      setSelectionStart((current) =>
        current === nextSelectionStart ? current : nextSelectionStart
      );
      setSelectionEnd((current) =>
        current === nextSelectionEnd ? current : nextSelectionEnd
      );
    },
    [textareaRef]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;

    adjustHeight(e.target);

    if (pendingAutocompleteValueRef.current === nextValue) {
      pendingAutocompleteValueRef.current = null;
      syncSelection(e.target);
      return;
    }

    pendingAutocompleteValueRef.current = null;
    setValue(nextValue);
    syncSelection(e.target);
  };

  const acceptSuggestion = useCallback(() => {
    const el = textareaRef.current;
    if (!suggestion || !el) {
      return;
    }

    const insertionText = getInlineAutocompleteInsertionText({
      beforeCursor: value.slice(0, selectionStart),
      suggestion,
    });

    if (!insertionText) {
      return;
    }

    const result = insertTextareaTextWithUndo({
      textarea: el,
      text: insertionText,
      selectionStart,
      selectionEnd,
    });

    adjustHeight(el);
    pendingAutocompleteValueRef.current = result.value;
    setValue(result.value);
    recordAccepted();

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
      syncSelection(el);
    });
  }, [
    adjustHeight,
    recordAccepted,
    selectionEnd,
    selectionStart,
    setValue,
    suggestion,
    syncSelection,
    textareaRef,
    value,
  ]);

  const acceptMentionSelection = useCallback(
    (item: MentionEntitySearchResult) => {
      const el = textareaRef.current;
      if (!el || !mentionAutocomplete || !activeMentionMatch) {
        return;
      }

      const replacementText =
        mentionAutocomplete.getReplacementText?.(item, {
          currentValue: value,
          replaceStart: activeMentionMatch.replaceStart,
          replaceEnd: activeMentionMatch.replaceEnd,
        }) ?? `@${item.mentionText} `;

      const result = insertTextareaTextWithUndo({
        textarea: el,
        text: replacementText,
        selectionStart: activeMentionMatch.replaceStart,
        selectionEnd: activeMentionMatch.replaceEnd,
      });

      adjustHeight(el);
      pendingAutocompleteValueRef.current = result.value;
      suppressMentionAutocompleteRef.current = true;
      if (mentionCloseSuppressionTimeoutRef.current !== null) {
        window.clearTimeout(mentionCloseSuppressionTimeoutRef.current);
      }
      setValue(result.value);
      setSelectionStart((current) =>
        current === result.selectionStart ? current : result.selectionStart
      );
      setSelectionEnd((current) =>
        current === result.selectionEnd ? current : result.selectionEnd
      );
      setMentionSelectedIndex(0);
      mentionAutocomplete.onSelectItem?.(item);
      mentionAutocomplete.onQueryChange(null);
      mentionCloseSuppressionTimeoutRef.current = window.setTimeout(() => {
        suppressMentionAutocompleteRef.current = false;
        mentionCloseSuppressionTimeoutRef.current = null;
      }, 250);

      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(result.selectionStart, result.selectionEnd);
        syncSelection(el);
      });
    },
    [
      activeMentionMatch,
      adjustHeight,
      mentionAutocomplete,
      setValue,
      syncSelection,
      textareaRef,
      value,
    ]
  );

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused((current) => (current ? false : current));
    dismissSuggestion("blur");
    mentionAutocomplete?.onQueryChange(null);
    props.onBlur?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused((current) => (current ? current : true));
    syncSelection(e.currentTarget);
    props.onFocus?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionMenuOpen && e.key === "ArrowDown") {
      e.preventDefault();
      if (mentionItems.length > 0) {
        setMentionSelectedIndex(
          (current) => (current + 1) % mentionItems.length
        );
      }
      onKeyDown?.(e);
      return;
    }

    if (mentionMenuOpen && e.key === "ArrowUp") {
      e.preventDefault();
      if (mentionItems.length > 0) {
        setMentionSelectedIndex((current) =>
          current === 0 ? mentionItems.length - 1 : current - 1
        );
      }
      onKeyDown?.(e);
      return;
    }

    if (
      mentionMenuOpen &&
      selectedMentionItem &&
      (e.key === "Enter" || e.key === "Tab")
    ) {
      e.preventDefault();
      acceptMentionSelection(selectedMentionItem);
      onKeyDown?.(e);
      return;
    }

    if (mentionMenuOpen && e.key === "Escape") {
      e.preventDefault();
      mentionAutocomplete?.onQueryChange(null);
      onKeyDown?.(e);
      return;
    }

    if (suggestion && e.key === "Tab") {
      e.preventDefault();
      acceptSuggestion();
      onKeyDown?.(e);
      return;
    }

    if (suggestion && e.key === "Escape") {
      e.preventDefault();
      dismissSuggestion("escape");
      onKeyDown?.(e);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative">
      {mentionMenuOpen && mentionPositionReference && mentionAutocomplete ? (
        <FloatingPortal>
          <div
            ref={mentionMenuFloatingRefs.setFloating}
            className="z-50"
            style={mentionMenuFloatingStyles}
          >
            <MentionEntityMenu
              results={mentionAutocomplete.items}
              loading={mentionAutocomplete.loading}
              selectedIndex={resolvedMentionSelectedIndex}
              onHover={setMentionSelectedIndex}
              onSelect={acceptMentionSelection}
              listboxId={mentionListboxId}
              getOptionId={getMentionOptionId}
              className="w-full"
              bodyStyle={{
                maxHeight: "var(--prompt-input-mention-menu-max-height, 18rem)",
              }}
            />
          </div>
        </FloatingPortal>
      ) : null}
      {suggestion && overlayStyle && !isLoading ? (
        <div
          className="text-muted-foreground pointer-events-none absolute z-10 overflow-hidden whitespace-nowrap opacity-55 select-none"
          style={{
            ...overlayStyle,
            WebkitMaskImage:
              "linear-gradient(to right, black 0%, black 82%, transparent 100%)",
            maskImage:
              "linear-gradient(to right, black 0%, black 82%, transparent 100%)",
          }}
        >
          {suggestion}
        </div>
      ) : null}
      <Textarea
        ref={handleRef}
        {...props}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={(e) => {
          syncSelection(e.currentTarget);
          props.onSelect?.(e);
        }}
        onClick={(e) => {
          syncSelection(e.currentTarget);
          props.onClick?.(e);
        }}
        onKeyUp={(e) => {
          syncSelection(e.currentTarget);
          props.onKeyUp?.(e);
        }}
        onScroll={(e) => {
          dismissSuggestion("manual");
          syncSelection(e.currentTarget);
          props.onScroll?.(e);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onCompositionStart={(e) => {
          setIsComposing((current) => (current ? current : true));
          dismissSuggestion("manual");
          mentionAutocomplete?.onQueryChange(null);
          props.onCompositionStart?.(e);
        }}
        onCompositionEnd={(e) => {
          setIsComposing((current) => (current ? false : current));
          syncSelection(e.currentTarget);
          props.onCompositionEnd?.(e);
        }}
        className={cn(
          "text-primary min-h-11 w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
          className
        )}
        role={mentionAutocomplete ? "combobox" : undefined}
        aria-autocomplete={mentionAutocomplete ? "list" : undefined}
        aria-controls={mentionMenuOpen ? mentionListboxId : undefined}
        aria-expanded={mentionAutocomplete ? mentionMenuOpen : undefined}
        aria-activedescendant={activeMentionOptionId}
        rows={1}
        disabled={disabled}
      />
    </div>
  );
}

export type PromptInputActionsProps = React.HTMLAttributes<HTMLDivElement>;

function PromptInputActions({
  children,
  className,
  ...props
}: PromptInputActionsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)} {...props}>
      {children}
    </div>
  );
}

export type PromptInputActionProps = {
  className?: string;
  tooltip: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
} & React.ComponentProps<typeof Tooltip>;

function PromptInputAction({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}: PromptInputActionProps) {
  const { disabled } = usePromptInput();

  return (
    <Tooltip {...props}>
      <TooltipTrigger
        asChild
        disabled={disabled}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
};
