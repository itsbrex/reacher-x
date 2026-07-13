import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspacePageSource = readFileSync(
  "features/webapp/workspace/WorkspacePage.tsx",
  "utf8"
);

test("Done submits workspace state without relying on the active tab's form", () => {
  assert.match(
    workspacePageSource,
    /function handleDone\(\) \{\s+void form\.handleSubmit\(handleSave\)\(\);\s+\}/,
    "Done should invoke the validated save handler directly"
  );
  assert.match(
    workspacePageSource,
    /<Button\s+size="xs"\s+type="button"\s+onClick=\{handleDone\}/,
    "the Done button should not depend on a tab-scoped HTML form target"
  );
});
