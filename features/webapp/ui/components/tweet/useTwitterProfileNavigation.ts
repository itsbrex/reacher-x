"use client";

import * as React from "react";
import {
  useProfile,
  type ProfileMode,
  type ProfileUser,
} from "@/features/profile/contexts/TwitterProfileContext";
import { useOptionalPanelStack } from "@/features/prospects/contexts/PanelStackContext";

export function useTwitterProfileNavigation() {
  const { openProfile: loadProfile, prefetchProfile } = useProfile();
  const panelStack = useOptionalPanelStack();

  const openProfile = React.useCallback(
    async (params: {
      username: string;
      initialTab?: ProfileMode;
      seedProfile?: ProfileUser;
    }) => {
      if (panelStack) {
        const props = {
          username: params.username,
          initialTab: params.initialTab,
        };
        if (panelStack.currentPanel) {
          panelStack.pushPanel("twitter-profile", props);
        } else {
          panelStack.openRootPanel("twitter-profile", props);
        }
        return;
      }
      await loadProfile(params);
    },
    [loadProfile, panelStack]
  );

  return {
    openProfile,
    prefetchProfile,
  };
}
