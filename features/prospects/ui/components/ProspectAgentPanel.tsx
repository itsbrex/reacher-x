"use client";

import * as React from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { AgentChat } from "@/features/agent/ui/AgentChat";
import {
  getTweetIdFromPostPayload,
  type InlinePanelOpenPayload,
} from "@/features/agent/lib";
import { useProfile } from "@/features/profile/contexts/TwitterProfileContext";
import { cn } from "@/shared/lib/utils";
import { usePanelStack } from "../../contexts/PanelStackContext";
import { useProspectProfile } from "../../contexts/ProspectProfileContext";

export interface ProspectAgentPanelProps {
  prospectId: string;
  onBack: () => void;
  className?: string;
}

export function ProspectAgentPanel({
  prospectId,
  onBack,
  className,
}: ProspectAgentPanelProps) {
  const { pushPanel, popPanel } = usePanelStack();
  const { openProspect } = useProspectProfile();
  const { openProfile } = useProfile();

  const handleOpenPanelFromCard = React.useCallback(
    (payload: InlinePanelOpenPayload) => {
      const resolvedProspectId = payload.prospectId ?? prospectId;

      if (
        payload.kind === "prospect_profile" ||
        payload.kind === "twitter_profile" ||
        payload.kind === "linkedin_profile" ||
        payload.kind === "post_list"
      ) {
        if (!resolvedProspectId) {
          return;
        }

        if (payload.kind === "prospect_profile") {
          popPanel();
          if (resolvedProspectId !== prospectId) {
            openProspect(resolvedProspectId as Id<"prospects">);
          }
          return;
        }

        if (payload.kind === "twitter_profile") {
          const username =
            payload.profileData &&
            typeof payload.profileData === "object" &&
            typeof (payload.profileData as Record<string, unknown>).username ===
              "string"
              ? ((payload.profileData as Record<string, unknown>)
                  .username as string)
              : undefined;

          if (username) {
            void openProfile({ username });
          }

          pushPanel("twitter-profile", { prospectId: resolvedProspectId });
          return;
        }

        if (payload.kind === "linkedin_profile") {
          pushPanel("linkedin-profile", { prospectId: resolvedProspectId });
          return;
        }

        pushPanel("evidence-posts", {
          prospectId: resolvedProspectId,
          title: payload.title ?? "Posts",
          posts: payload.posts ?? [],
          platform: payload.platform,
        });
        return;
      }

      pushPanel("task-compose", {
        prospectId: resolvedProspectId,
        taskId: payload.taskId,
        actionRequestId: payload.actionRequestId,
        targetTweetId:
          payload.targetTweetId ?? getTweetIdFromPostPayload(payload),
        panelMode: payload.panelMode ?? "approval",
        requestedKind: payload.kind === "dm" ? "dm" : "post",
        requestedDmPlatform: payload.kind === "dm" ? payload.platform : null,
        fallbackPost: {
          platform: payload.platform,
          postData: payload.postData,
          postRef: payload.postRef,
          postSummary: payload.postSummary,
        },
      });
    },
    [openProfile, openProspect, popPanel, prospectId, pushPanel]
  );

  const handleOpenPlanPanel = React.useCallback(
    (targetProspectId?: string | null) => {
      const resolvedProspectId =
        typeof targetProspectId === "string" && targetProspectId.trim().length
          ? targetProspectId
          : prospectId;

      if (!resolvedProspectId) {
        return;
      }

      if (resolvedProspectId !== prospectId) {
        popPanel();
        openProspect(resolvedProspectId as Id<"prospects">);
        return;
      }

      popPanel();
    },
    [openProspect, popPanel, prospectId]
  );

  const handleOpenDmPanel = React.useCallback(
    (platform?: "twitter" | "linkedin") => {
      pushPanel("platform-conversation", {
        prospectId,
        platform,
      });
    },
    [prospectId, pushPanel]
  );

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full max-w-lg flex-1 overflow-hidden md:min-w-0",
        className
      )}
    >
      <AgentChat
        prospectId={prospectId}
        onBack={onBack}
        onOpenPanelFromCard={handleOpenPanelFromCard}
        onOpenPlanPanel={handleOpenPlanPanel}
        onViewProfile={popPanel}
        onOpenDmPanel={handleOpenDmPanel}
      />
    </aside>
  );
}
