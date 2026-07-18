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

      const props = {
        identity,
        ...(prospectId ? { prospectId } : {}),
      };
      if (panelStack.currentPanel) {
        panelStack.pushPanel("linkedin-profile", props);
      } else {
        panelStack.openRootPanel("linkedin-profile", props);
      }
    },
    [panelStack]
  );
}
