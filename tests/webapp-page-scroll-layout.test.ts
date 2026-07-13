import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (file: string) => readFileSync(file, "utf8");

const pageScrollAreaSource = readSource(
  "features/webapp/ui/components/page/PageScrollArea.tsx"
);
const notificationsSource = readSource("app/(webapp)/notifications/page.tsx");
const workspaceSource = readSource(
  "features/webapp/workspace/WorkspacePage.tsx"
);

test("PageScrollArea is a full-width, height-constrained scroll owner", () => {
  assert.match(pageScrollAreaSource, /data-slot="page-scroll-area"/);
  for (const requiredClass of [
    "min-h-0",
    "min-w-0",
    "flex-1",
    "overflow-y-auto",
    "overscroll-contain",
  ]) {
    assert.match(
      pageScrollAreaSource,
      new RegExp(`\\b${requiredClass}\\b`),
      `PageScrollArea should include ${requiredClass}`
    );
  }
});

test("narrow Workspace and Notifications content sits inside the page scroller", () => {
  assert.match(
    workspaceSource,
    /<PageScrollArea[\s\S]*?<PageContent className=\{workspaceBodyColumnClassName\}>/
  );
  assert.match(
    notificationsSource,
    /<PageScrollArea>[\s\S]*?<PageContent[\s\S]*NOTIFICATIONS_BODY_COLUMN_CLASS_NAME/
  );
  assert.doesNotMatch(
    notificationsSource,
    /NOTIFICATIONS_BODY_COLUMN_CLASS_NAME[\s\S]{0,180}(md:flex-none|overflow-y-auto)/,
    "the constrained notifications column must not own page scrolling"
  );
});

const pageScrollAreaRoutes = [
  ["Notifications", "app/(webapp)/notifications/page.tsx"],
  ["Workspace", "features/webapp/workspace/WorkspacePage.tsx"],
] as const;

for (const [pageName, file] of pageScrollAreaRoutes) {
  test(`${pageName} uses the shared full-width page scroll owner`, () => {
    assert.match(readSource(file), /<PageScrollArea/);
  });
}

test("existing full-width dashboard scroll owners remain height-constrained", () => {
  const nativeScrollFiles = [
    "app/(webapp)/agent-ops/page.tsx",
    "app/(webapp)/analytics/page.tsx",
    "features/billing/ui/PlansPage.tsx",
    "features/usage/ui/UsagePage.tsx",
    "app/(webapp)/settings/connected-accounts/page.tsx",
  ];

  for (const file of nativeScrollFiles) {
    const source = readSource(file);
    assert.match(source, /\bmin-h-0\b/);
    assert.match(source, /\bflex-1\b/);
    assert.match(source, /\boverflow-y-auto\b/);
  }
});

test("list, chat, history, and detail route families retain explicit scroll owners", () => {
  const scrollAreaFiles = [
    "app/(webapp)/page.tsx",
    "app/(webapp)/archives/page.tsx",
    "features/webapp/ui/pages/UseCaseSuccessPage.tsx",
    "features/agent/ui/components/HistoryPanel.tsx",
    "features/prospects/ui/components/ProspectProfilePanel.tsx",
    "features/webapp/ui/components/linkedin/LinkedInPostThreadPanel.tsx",
  ];

  for (const file of scrollAreaFiles) {
    assert.match(readSource(file), /<ScrollArea/);
  }

  assert.match(
    readSource("features/agent/ui/AgentChat.tsx"),
    /<MessageScroller/
  );
  assert.match(
    readSource("features/webapp/ui/components/WebAppChromeScaffold.tsx"),
    /<main className="[^"]*overflow-auto[^"]*"/,
    "document-style routes must retain the far-edge main scroll fallback"
  );
});

test("the standalone history route expands its panel scroller to the page edge", () => {
  const historyRouteSource = readSource("app/(webapp)/agent/history/page.tsx");

  assert.match(historyRouteSource, /className="max-w-none"/);
  assert.match(historyRouteSource, /layoutClassName="max-w-none border-r-0"/);
});
