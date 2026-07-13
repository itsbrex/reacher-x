import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspacePageSource = readFileSync(
  "features/webapp/workspace/WorkspacePage.tsx",
  "utf8"
);
const workspaceSkeletonSource = readFileSync(
  "features/webapp/workspace/WorkspacePageSkeleton.tsx",
  "utf8"
);

test("the workspace loading state reuses the loaded page shell", () => {
  assert.match(
    workspacePageSource,
    /if \(authLoading \|\| isHydrating\) \{[\s\S]*?<div className=\{workspacePageShellClassName\}>[\s\S]*?<PageLayout className=\{workspaceMainColumnClassName\}>/,
    "loading should use the same full-width shell and main column as loaded content"
  );
  assert.match(
    workspacePageSource,
    /<WorkspacePageSkeleton\s+bodyColumnClassName=\{workspaceBodyColumnClassName\}/,
    "only the loading form body should receive the constrained column width"
  );
});

test("the skeleton tabs remain outside the constrained body column", () => {
  const tabsIndex = workspaceSkeletonSource.indexOf("<TabsList");
  const bodyColumnIndex = workspaceSkeletonSource.indexOf(
    "<PageContent className={bodyColumnClassName}>"
  );

  assert.notEqual(tabsIndex, -1, "skeleton tabs should be rendered");
  assert.notEqual(
    bodyColumnIndex,
    -1,
    "skeleton body column should be rendered"
  );
  assert.ok(
    tabsIndex < bodyColumnIndex,
    "tabs must span the page before the form body is width-constrained"
  );
});

test("the workspace scroll owner spans the page outside the constrained body", () => {
  const bodyColumnClasses = workspacePageSource.match(
    /const workspaceBodyColumnClassName =\s+"([^"]+)";/
  )?.[1];

  assert.ok(bodyColumnClasses, "workspace body column classes should exist");
  assert.match(bodyColumnClasses, /\bw-full\b/);
  assert.match(bodyColumnClasses, /\bmd:max-w-lg\b/);
  assert.doesNotMatch(
    bodyColumnClasses,
    /(overflow-y-auto|md:flex-none)/,
    "the narrow body must not own scrolling or expand outside the viewport"
  );
  assert.match(
    workspacePageSource,
    /<PageScrollArea[\s\S]*?<PageContent className=\{workspaceBodyColumnClassName\}>/,
    "the full-width page scroll area must wrap the narrow workspace body"
  );
  assert.match(
    workspaceSkeletonSource,
    /<PageScrollArea[\s\S]*?<PageContent className=\{bodyColumnClassName\}>/,
    "loading and loaded workspace layouts must share the same scroll hierarchy"
  );
});
