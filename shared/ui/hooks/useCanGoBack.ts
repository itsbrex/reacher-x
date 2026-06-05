import { useSyncExternalStore } from "react";

let clientSnapshotReady = false;

function getCanGoBackSnapshot(): boolean {
  if (typeof window === "undefined" || !clientSnapshotReady) {
    return false;
  }

  return window.history.length > 1;
}

function getCanGoBackServerSnapshot(): boolean {
  return false;
}

function subscribeCanGoBack(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  queueMicrotask(() => {
    clientSnapshotReady = true;
    onStoreChange();
  });

  window.addEventListener("popstate", onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
  };
}

export function useCanGoBack(): boolean {
  return useSyncExternalStore(
    subscribeCanGoBack,
    getCanGoBackSnapshot,
    getCanGoBackServerSnapshot
  );
}
