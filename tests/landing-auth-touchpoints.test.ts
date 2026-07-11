import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const LANDING_ROOTS = [
  "app/home",
  "app/(landing)",
  "features/landing",
] as const;
const AUTH_ROUTE_LITERAL = /["']\/(?:login|signup|logout)(?:\?[^"']*)?["']/;
const ALLOWED_AUTH_ROUTE_FILE = path.normalize(
  "features/landing/ui/components/LandingAuthLink.tsx"
);

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTypeScriptFiles(entryPath);
    }
    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")
      ? [entryPath]
      : [];
  });
}

test("landing auth touchpoints use the safe shared navigation component", () => {
  const unsafeFiles = LANDING_ROOTS.flatMap(collectTypeScriptFiles).filter(
    (file) =>
      path.normalize(file) !== ALLOWED_AUTH_ROUTE_FILE &&
      AUTH_ROUTE_LITERAL.test(readFileSync(file, "utf8"))
  );

  assert.deepEqual(unsafeFiles, []);
});
