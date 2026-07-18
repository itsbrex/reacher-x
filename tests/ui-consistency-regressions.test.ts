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

test("task approval panels render LinkedIn comments with LinkedIn UI", () => {
  const panelSource = readSource(
    "features/agent/ui/components/AgentDynamicPanel.tsx"
  );
  const outreachSource = readSource("convex/outreach.ts");

  assert.match(panelSource, /const platform = data\.platform/);
  assert.match(panelSource, /if \(platform === "linkedin"\)/);
  assert.match(panelSource, /task-linkedin-comment:/);
  assert.match(panelSource, /<LinkedInPostCard/);
  assert.match(panelSource, /<LinkedInReplyComposer/);
  assert.match(panelSource, /<LinkedInCommentItem/);
  assert.match(panelSource, /placeholder="Add a comment\.\.\."/);
  assert.doesNotMatch(
    panelSource,
    /data\.originalPost\?\.platform \|\| "twitter"/
  );
  assert.match(outreachSource, /matchesLinkedInPostReference/);
});

test("LinkedIn unavailable states use shared actionable alerts", () => {
  const commentThreadSource = readSource(
    "features/webapp/ui/components/linkedin/LinkedInCommentThread.tsx"
  );
  const conversationSource = readSource(
    "features/prospects/ui/components/LinkedInConversationPanel.tsx"
  );

  assert.doesNotMatch(commentThreadSource, /Limited thread sync/);
  assert.match(commentThreadSource, /resolveLinkedInRecoveryAction/);
  assert.match(commentThreadSource, /<AlertTitle>\{unavailableTitle\}/);
  assert.doesNotMatch(
    conversationSource,
    /rounded-\[20px\][^\n]*Messaging unavailable/
  );
  assert.match(conversationSource, /<AlertTitle>Messaging unavailable/);
  assert.match(conversationSource, /messagingRecoveryAction\.label/);
});

test("desktop side panels own a left divider and mobile panels have no side borders", () => {
  const pageLayoutSource = readSource(
    "features/webapp/ui/components/page/PageLayout.tsx"
  );

  assert.match(
    pageLayoutSource,
    /border-x-0 md:border-border md:border-l md:border-r-0/
  );
  assert.doesNotMatch(pageLayoutSource, /min-w-0 md:border-r(?:\s|["'])/);

  for (const file of [
    "app/(webapp)/page.tsx",
    "app/(webapp)/archives/page.tsx",
    "app/(webapp)/post/linkedin/[id]/page.tsx",
    "app/(webapp)/post/x/[id]/page.tsx",
    "features/agent/ui/AgentPageShell.tsx",
    "features/prospects/ui/pages/UseCaseProspectPage.tsx",
    "features/webapp/ui/pages/UseCaseSuccessPage.tsx",
    "features/webapp/workspace/WorkspaceRefinePanel.tsx",
  ]) {
    assert.match(
      readSource(file),
      /DESKTOP_PANEL_BORDER_CLASS_NAME/,
      `${file} must use the shared panel border contract`
    );
  }

  for (const file of [
    "features/agent/ui/components/AgentOnboardingPanel.tsx",
    "features/agent/ui/components/AgentOnboardingPanelSpinner.tsx",
  ]) {
    const source = readSource(file);
    assert.match(source, /DESKTOP_PANEL_BORDER_CLASS_NAME/);
    assert.doesNotMatch(source, /md:border-r(?:\s|["'])/);
  }
});
