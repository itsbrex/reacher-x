import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const PROSPECT_CARD_MENU_FILE =
  "features/prospects/ui/components/prospect-card/ProspectCardMenu.tsx";

test("the prospect card Agent action opens the canonical scoped route", () => {
  const source = readFileSync(PROSPECT_CARD_MENU_FILE, "utf8");

  assert.match(
    source,
    /const handleOpenAgentPanel = \(e: React\.MouseEvent\) => \{\s*e\.stopPropagation\(\);\s*router\.push\(`\/agent\?prospectId=\$\{prospectId\}`\);\s*\};/
  );
  assert.doesNotMatch(
    source,
    /handleOpenAgentPanel[\s\S]*?pushPanel\("prospect-agent"/
  );
});
