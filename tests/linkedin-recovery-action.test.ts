import assert from "node:assert/strict";
import test from "node:test";
import { resolveLinkedInRecoveryAction } from "../shared/lib/linkedin/recovery";

test("LinkedIn recovery actions route account failures to connected accounts", () => {
  assert.deepEqual(resolveLinkedInRecoveryAction("missing_connection"), {
    href: "/settings/connected-accounts",
    label: "Connect account",
  });
  assert.deepEqual(resolveLinkedInRecoveryAction("missing_scopes"), {
    href: "/settings/connected-accounts",
    label: "Reconnect account",
  });
  assert.deepEqual(resolveLinkedInRecoveryAction("action_required"), {
    href: "/settings/connected-accounts",
    label: "Manage account",
  });
});

test("LinkedIn recovery actions route subscription failures to plans", () => {
  assert.deepEqual(resolveLinkedInRecoveryAction("subscription_required"), {
    href: "/plans",
    label: "View plans",
  });
  assert.equal(resolveLinkedInRecoveryAction("unknown"), null);
});
