import assert from "node:assert/strict";
import test from "node:test";
import { createIntentionalDocumentNavigationController } from "../shared/lib/convex/intentionalDocumentNavigation";

test("intentional auth navigation starts synchronously without waiting for Convex", () => {
  const controller = createIntentionalDocumentNavigationController();
  const assignedHrefs: string[] = [];

  controller.navigate(
    "/login",
    {
      assign: (href) => assignedHrefs.push(href),
    },
    () => undefined
  );

  assert.deepEqual(assignedHrefs, ["/login"]);
  assert.equal(controller.shouldWarnBeforeUnload(true), false);
});

test("the bypass applies to one intentional unload only", () => {
  const controller = createIntentionalDocumentNavigationController();

  controller.navigate("/signup", { assign: () => undefined }, () => undefined);

  assert.equal(controller.shouldWarnBeforeUnload(true), false);
  assert.equal(controller.shouldWarnBeforeUnload(true), true);
  assert.equal(controller.shouldWarnBeforeUnload(false), false);
});

test("failed navigation preserves the genuine unsaved-change warning", () => {
  const controller = createIntentionalDocumentNavigationController();

  assert.throws(() =>
    controller.navigate(
      "/login",
      {
        assign: () => {
          throw new Error("navigation failed");
        },
      },
      () => undefined
    )
  );

  assert.equal(controller.shouldWarnBeforeUnload(true), true);
});

test("the fallback reset restores protection when no unload occurs", () => {
  const controller = createIntentionalDocumentNavigationController();
  let reset: (() => void) | undefined;

  controller.navigate("/logout", { assign: () => undefined }, (callback) => {
    reset = callback;
  });
  reset?.();

  assert.equal(controller.shouldWarnBeforeUnload(true), true);
});
