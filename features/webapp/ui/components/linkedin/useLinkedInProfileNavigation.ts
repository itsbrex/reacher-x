"use client";

import * as React from "react";
import { useOptionalPanelStack } from "@/features/prospects/contexts/PanelStackContext";
import type { LinkedInProfileIdentity } from "@/shared/lib/linkedin/profile";

export function useLinkedInProfileNavigation() {
  const panelStack = useOptionalPanelStack();

  return React.useCallback(
    (identity: LinkedInProfileIdentity, prospectId?: string) => {
      if (!panelStack) {
        return;
      }

      panelStack.pushPanel("linkedin-profile", {
        identity,
        ...(prospectId ? { prospectId } : {}),
      });
    },
    [panelStack]
  );
}
