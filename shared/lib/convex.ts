// shared/lib/convex.ts

import { ConvexReactClient } from "convex/react";
import { installConvexUnsavedChangesWarning } from "./convex/intentionalDocumentNavigation";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  verbose: process.env.NODE_ENV !== "production",
  // Replaced by our scoped guard so intentional OAuth navigation is immediate.
  unsavedChangesWarning: false,
});

if (typeof window !== "undefined") {
  installConvexUnsavedChangesWarning(convex, window);
}

export { convex };
