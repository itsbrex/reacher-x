import assert from "node:assert/strict";
import test from "node:test";
import { isAssistantPlaceholderMessage } from "../features/agent/lib/assistantMessageState";

test("treats empty pending assistant messages as placeholders", () => {
  const message = {
    role: "assistant",
    status: "pending",
    text: "",
    parts: [],
  };

  assert.equal(isAssistantPlaceholderMessage(message as any), true);
});

test("does not treat assistant messages with text as placeholders", () => {
  const message = {
    role: "assistant",
    status: "streaming",
    text: "Hello there",
    parts: [],
  };

  assert.equal(isAssistantPlaceholderMessage(message as any), false);
});

test("does not treat assistant messages with tool parts as placeholders", () => {
  const message = {
    role: "assistant",
    status: "streaming",
    text: "",
    parts: [
      {
        type: "tool-searchWorkspace",
        state: "input-available",
      },
    ],
  };

  assert.equal(isAssistantPlaceholderMessage(message as any), false);
});

test("ignores non-assistant messages", () => {
  const message = {
    role: "user",
    status: "pending",
    text: "",
    parts: [],
  };

  assert.equal(isAssistantPlaceholderMessage(message as any), false);
});
