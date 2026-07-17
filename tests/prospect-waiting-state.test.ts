import assert from "node:assert/strict";
import test from "node:test";
import { getProspectWaitingStateCopy } from "../features/prospects/lib/prospectEmptyStateCopy";

test("waiting-state copy follows the active use-case terminology", () => {
  assert.deepEqual(getProspectWaitingStateCopy({ entityPlural: "Investors" }), {
    message:
      "Agent is preparing your investors. They will appear here in 5 to 30 minutes.",
  });
});
