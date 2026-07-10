import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMainAgentPrompt,
  buildOutreachAgentPrompt,
} from "../convex/agents/prompts";

test("main agent prompt requires live workspace reads for mutable facts", () => {
  const prompt = buildMainAgentPrompt();

  assert.match(prompt, /call `queryWorkspace` before answering/);
  assert.match(prompt, /plan count is not qualification count/);
  assert.match(prompt, /getProspectInteractionHistory/);
});

test("prospect agent prompt routes real conversation questions to interaction history", () => {
  const prompt = buildOutreachAgentPrompt();

  assert.match(prompt, /call `getProspectInteractionHistory` before answering/);
  assert.match(prompt, /Do not treat public timeline posts/);
});
