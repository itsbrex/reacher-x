import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the auth callback resolves onboarding before choosing its redirect", () => {
  const callbackRoute = readFileSync("app/callback/route.ts", "utf8");

  assert.match(callbackRoute, /handleAuth\(\{[\s\S]*onSuccess:/);
  assert.match(callbackRoute, /bootstrapPostAuthSetup/);
  assert.match(callbackRoute, /applyPostAuthRedirect/);
});

test("AuthKit receives server-hydrated auth behind a Suspense boundary", () => {
  const serverProvider = readFileSync("app/ConvexClientProvider.tsx", "utf8");
  const clientProvider = readFileSync(
    "app/ConvexClientProviderClient.tsx",
    "utf8"
  );
  const rootLayout = readFileSync("app/layout.tsx", "utf8");

  assert.match(serverProvider, /await withAuth\(\)/);
  assert.match(clientProvider, /<AuthKitProvider initialAuth=\{initialAuth\}>/);
  assert.match(
    rootLayout,
    /<Suspense fallback=\{null\}>\s*<ConvexClientProvider>/
  );
  assert.ok(
    rootLayout.indexOf("<ThemeProvider") <
      rootLayout.indexOf("<Suspense fallback={null}>")
  );
});

test("next-themes only renders its initialization script on the server", () => {
  const workspaceConfig = readFileSync("pnpm-workspace.yaml", "utf8");
  const nextThemesPatch = readFileSync(
    "patches/next-themes@0.4.6.patch",
    "utf8"
  );

  assert.match(
    workspaceConfig,
    /next-themes@0\.4\.6: patches\/next-themes@0\.4\.6\.patch/
  );
  assert.match(nextThemesPatch, /diff --git a\/dist\/index\.mjs/);
  assert.match(nextThemesPatch, /diff --git a\/dist\/index\.js/);
  assert.equal(
    nextThemesPatch.match(/if\(typeof window!="undefined"\)return null/g)
      ?.length,
    2
  );
});
