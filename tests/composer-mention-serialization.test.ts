import assert from "node:assert/strict";
import test from "node:test";
import { extractTextFromEditorState } from "../shared/lib/utils/url/urlDetection";

test("extractTextFromEditorState preserves lexical mention nodes", () => {
  const text = extractTextFromEditorState({
    root: {
      children: [
        {
          type: "paragraph",
          children: [
            {
              type: "text",
              text: "Please review ",
            },
            {
              type: "MentionNode",
              mentionName: "Plan: Jane Doe",
            },
            {
              type: "text",
              text: " before sending.",
            },
          ],
        },
      ],
    },
  });

  assert.equal(text, "Please review @Plan: Jane Doe before sending.");
});
