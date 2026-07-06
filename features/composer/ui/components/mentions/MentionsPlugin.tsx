"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  MenuOption,
  MenuTextMatch,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  TextNode,
} from "lexical";
import { createPortal } from "react-dom";
import { useMentionEntitySearch, useWorkspace } from "@/shared/hooks";
import type { MentionEntitySearchResult } from "@/shared/lib/mentions/mentionEntities";
import { MentionEntityMenu } from "@/shared/ui/components/mentions/MentionEntityMenu";
import { buildComposerMentionInsertionText } from "@/features/composer/lib/entityMentions";
import type { ComposerEntityMentionsConfig } from "@/features/composer/types";

const LexicalTypeaheadMenuPlugin = dynamic(
  () =>
    import("@lexical/react/LexicalTypeaheadMenuPlugin").then(
      (mod) => mod.LexicalTypeaheadMenuPlugin
    ),
  { ssr: false }
);

const PUNCTUATION =
  "\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%'\"~=<>_:;";
const NAME = "\\b[A-Z][^\\s" + PUNCTUATION + "]";

const DocumentMentionsRegex = {
  NAME,
  PUNCTUATION,
};

const PUNC = DocumentMentionsRegex.PUNCTUATION;
const TRIGGERS = ["@"].join("");
const VALID_CHARS = "[^" + TRIGGERS + PUNC + "\\s]";
const VALID_JOINS = "(?:" + "\\.[ |$]|" + " |" + "[" + PUNC + "]|" + ")";
const LENGTH_LIMIT = 75;

const AtSignMentionsRegex = new RegExp(
  "(^|\\s|\\()(" +
    "[" +
    TRIGGERS +
    "]" +
    "((?:" +
    VALID_CHARS +
    VALID_JOINS +
    "){0," +
    LENGTH_LIMIT +
    "})" +
    ")$"
);

const ALIAS_LENGTH_LIMIT = 50;
const AtSignMentionsRegexAliasRegex = new RegExp(
  "(^|\\s|\\()(" +
    "[" +
    TRIGGERS +
    "]" +
    "((?:" +
    VALID_CHARS +
    "){0," +
    ALIAS_LENGTH_LIMIT +
    "})" +
    ")$"
);

const SUGGESTION_LIST_LENGTH_LIMIT = 8;

function checkForAtSignMentions(
  text: string,
  minMatchLength: number
): MenuTextMatch | null {
  let match = AtSignMentionsRegex.exec(text);

  if (match === null) {
    match = AtSignMentionsRegexAliasRegex.exec(text);
  }
  if (match !== null) {
    const maybeLeadingWhitespace = match[1];
    const matchingString = match[3];
    if (matchingString.length >= minMatchLength) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString,
        replaceableString: match[2],
      };
    }
  }
  return null;
}

function getPossibleQueryMatch(text: string): MenuTextMatch | null {
  return checkForAtSignMentions(text, 1);
}

class MentionTypeaheadOption extends MenuOption {
  entity: MentionEntitySearchResult;

  constructor(entity: MentionEntitySearchResult) {
    super(entity.label);
    this.entity = entity;
  }
}

export function MentionsPlugin({
  entityMentions,
}: {
  entityMentions?: ComposerEntityMentionsConfig;
}): React.JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const searchParams = useSearchParams();
  const prospectId =
    entityMentions?.prospectId ?? searchParams.get("prospectId");
  const { workspace } = useWorkspace();
  const [queryString, setQueryString] = React.useState<string | null>(null);
  const closeSuppressionTimeoutRef = React.useRef<number | null>(null);
  const suppressQueryWhileClosingRef = React.useRef(false);
  const { results, loading } = useMentionEntitySearch({
    enabled: queryString !== null,
    query: queryString,
    workspaceId: workspace?._id ?? null,
    prospectId,
    limit: SUGGESTION_LIST_LENGTH_LIMIT,
    remoteAllowedKinds: entityMentions?.remoteAllowedKinds,
    localEntities: entityMentions?.localEntities,
  });

  React.useEffect(
    () => () => {
      if (closeSuppressionTimeoutRef.current !== null) {
        window.clearTimeout(closeSuppressionTimeoutRef.current);
      }
    },
    []
  );

  const handleQueryChange = React.useCallback((nextQuery: string | null) => {
    if (suppressQueryWhileClosingRef.current) {
      setQueryString(null);
      return;
    }

    setQueryString(nextQuery);
  }, []);

  const checkForSlashTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
    minLength: 0,
  });

  const options = React.useMemo(
    () =>
      results
        .map((result) => new MentionTypeaheadOption(result))
        .slice(0, SUGGESTION_LIST_LENGTH_LIMIT),
    [results]
  );

  const armMentionCloseSuppression = React.useCallback(() => {
    suppressQueryWhileClosingRef.current = true;
    if (closeSuppressionTimeoutRef.current !== null) {
      window.clearTimeout(closeSuppressionTimeoutRef.current);
    }
    setQueryString(null);
    closeSuppressionTimeoutRef.current = window.setTimeout(() => {
      suppressQueryWhileClosingRef.current = false;
      closeSuppressionTimeoutRef.current = null;
    }, 250);
  }, []);

  const onSelectOption = React.useCallback(
    (
      selectedOption: MentionTypeaheadOption,
      nodeToReplace: TextNode | null,
      closeMenu: () => void
    ) => {
      const replacementText = buildComposerMentionInsertionText({
        entity: selectedOption.entity,
        config: entityMentions,
      });

      armMentionCloseSuppression();
      closeMenu();

      editor.update(() => {
        const replacementNode = $createTextNode(replacementText ?? "");

        if (nodeToReplace) {
          nodeToReplace.replace(replacementNode);
        } else {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertNodes([replacementNode]);
          }
        }
        if (replacementText) {
          replacementNode.selectEnd();
        } else {
          replacementNode.selectNext();
        }
      });

      entityMentions?.onSelectEntity?.(selectedOption.entity);
    },
    [armMentionCloseSuppression, editor, entityMentions]
  );

  const checkForMentionMatch = React.useCallback(
    (text: string) => {
      const slashMatch = checkForSlashTriggerMatch(text, editor);
      if (slashMatch !== null) {
        return null;
      }
      return getPossibleQueryMatch(text);
    },
    [checkForSlashTriggerMatch, editor]
  );

  return (
    // @ts-expect-error Lexical plugin generics are broader than the runtime type.
    <LexicalTypeaheadMenuPlugin<MentionTypeaheadOption>
      onQueryChange={handleQueryChange}
      onSelectOption={onSelectOption}
      triggerFn={checkForMentionMatch}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) => {
        return anchorElementRef.current && queryString !== null
          ? createPortal(
              <MentionEntityMenu
                results={results}
                loading={loading}
                selectedIndex={selectedIndex}
                onHover={setHighlightedIndex}
                onSelect={(item) => {
                  const option = options.find(
                    (candidate) => candidate.entity.id === item.id
                  );
                  if (option) {
                    selectOptionAndCleanUp(option);
                  }
                }}
                className="w-80"
              />,
              anchorElementRef.current
            )
          : null;
      }}
    />
  );
}
