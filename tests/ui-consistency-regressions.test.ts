import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (file: string) => readFileSync(file, "utf8");

test("the desktop upgrade panel separates from its content with a left border", () => {
  const source = readSource("features/billing/ui/PlansPage.tsx");

  assert.match(source, /md:border-l/);
  assert.doesNotMatch(source, /md:border-r/);
});

test("the workspace status bar uses active use-case terminology", () => {
  const source = readSource(
    "features/webapp/ui/components/WorkspaceSystemStatusFeedBar.tsx"
  );

  assert.match(source, /useActiveUseCaseLabels/);
  assert.match(source, /entitySingular/);
  assert.match(source, /entityPlural/);
  assert.doesNotMatch(source, /prospect(?:s)?\s+(?:pending|not ready)/i);
});

test("the landing avatar menu reads the authoritative onboarding lock", () => {
  const source = readSource("features/landing/ui/components/Header.tsx");

  assert.doesNotMatch(source, /\$onboardingLock/);
  assert.match(
    source,
    /const locked = shellState\?\.locked \?\? shellStateQuery\.isPending/
  );
});
