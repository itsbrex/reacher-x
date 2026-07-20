"use client";

import * as React from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { useAgentProspectQuery } from "@/features/agent/hooks/useAgentProspectQuery";
import { AgentChat } from "@/features/agent/ui/AgentChat";
import { HistoryPanel } from "@/features/agent/ui/components/HistoryPanel";
import { WorkspaceProfileReviewPanel } from "@/features/agent/ui/components/WorkspaceProfileReviewPanel";
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
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(
    null
  );
  const [effectiveThreadId, setEffectiveThreadId] = React.useState<
    string | null
  >(null);
  const [newThreadSignal, setNewThreadSignal] = React.useState(0);
  const [workspaceProfileRequestId, setWorkspaceProfileRequestId] =
    React.useState<string | null>(null);
  const prospectQuery = useAgentProspectQuery(prospectId);
  const prospectArchived = prospectQuery.data?.status === "archived";

  const handleNewThread = React.useCallback(() => {
    setSelectedThreadId(null);
    setEffectiveThreadId(null);
    setNewThreadSignal((current) => current + 1);
    setHistoryOpen(false);
  }, []);

  const handleSelectThread = React.useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
    setEffectiveThreadId(threadId);
    setHistoryOpen(false);
  }, []);

  const handleDeleteCurrentThread = React.useCallback(() => {
    setSelectedThreadId(null);
    setEffectiveThreadId(null);
  }, []);

  const handleOpenHistory = React.useCallback(() => {
    setHistoryOpen(true);
  }, []);

  const handleCloseHistory = React.useCallback(() => {
    setHistoryOpen(false);
  }, []);

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

  const panelClassName = cn(
    "flex h-full min-h-0 w-full max-w-lg flex-1 overflow-hidden md:min-w-0",
    className
  );

  if (workspaceProfileRequestId) {
    return (
      <WorkspaceProfileReviewPanel
        requestId={workspaceProfileRequestId}
        onClose={() => setWorkspaceProfileRequestId(null)}
        className={panelClassName}
      />
    );
  }

  if (historyOpen) {
    return (
      <HistoryPanel
        scope={{
          kind: "prospect",
          prospectId: prospectId as Id<"prospects">,
          prospectArchived,
        }}
        currentThreadId={effectiveThreadId ?? selectedThreadId ?? undefined}
        onClose={handleCloseHistory}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
        onDeleteCurrentThread={handleDeleteCurrentThread}
        className={panelClassName}
      />
    );
  }

  return (
    <aside className={panelClassName}>
      <AgentChat
        prospectId={prospectId}
        threadId={selectedThreadId ?? undefined}
        onBack={onBack}
        onHistoryClick={handleOpenHistory}
        onNewThread={handleNewThread}
        newThreadSignal={newThreadSignal}
        onEffectiveThreadIdChange={setEffectiveThreadId}
        onOpenPanelFromCard={handleOpenPanelFromCard}
        onOpenPlanPanel={handleOpenPlanPanel}
        onOpenWorkspaceProfilePanel={setWorkspaceProfileRequestId}
        onViewProfile={popPanel}
        onOpenDmPanel={handleOpenDmPanel}
        shellProspectQuery={{
          data: prospectQuery.data,
          isPending: prospectQuery.isPending,
        }}
      />
    </aside>
  );
}
