import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSetupPreviewWaitingCopy } from "../features/agent/lib/setupPreviewWaitingCopy";

const workspaceInputStepSource = readFileSync(
  "features/agent/ui/components/onboarding/WorkspaceInputStep.tsx",
  "utf8"
);

test("preview waiting copy follows the active use-case terminology", () => {
  assert.deepEqual(getSetupPreviewWaitingCopy({ entityPlural: "Investors" }), {
    title: "Finding preview investors",
    searchContext: "Quick search based on your approved profiles.",
    previewDisclaimer: "Preview results may differ from final results.",
    estimate: "Most finish in 2–5 min. Some take up to 10.",
    progressTitle: "Preview search progress",
  });
});

test("the real setup flow uses the waiting state for every preview-search phase", () => {
  assert.match(workspaceInputStepSource, /<SetupPreviewWaitingState/);
  assert.match(
    workspaceInputStepSource,
    /phase === "provisioning_preview_workspace"/
  );
  assert.match(
    workspaceInputStepSource,
    /phase === "discovering_preview_prospects"/
  );
  assert.match(
    workspaceInputStepSource,
    /phase === "preview_search_in_progress"/
  );
  assert.doesNotMatch(workspaceInputStepSource, /SetupPreviewProgressTimeline/);
});
