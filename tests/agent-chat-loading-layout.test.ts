import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const AGENT_CHAT_FILE = "features/agent/ui/AgentChat.tsx";

test("bare /agent keeps its centered composer while initialization resolves", () => {
  const source = readFileSync(AGENT_CHAT_FILE, "utf8");

  assert.match(
    source,
    /const isBareWorkspaceDraft =\s*!threadId && !prospectId && !action && !isSetupRoute;/
  );
  assert.match(
    source,
    /if \(!isInitialized && !isBareWorkspaceDraft\) \{\s*return \(\s*<ChatSkeleton/
  );
  assert.match(
    source,
    /const isComposerLocked =\s*!isInitialized \|\|\s*isLoading \|\|/
  );
});
