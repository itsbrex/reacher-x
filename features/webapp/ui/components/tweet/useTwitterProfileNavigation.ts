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
        panelStack.pushPanel("twitter-profile", {
          username: params.username,
        });
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
