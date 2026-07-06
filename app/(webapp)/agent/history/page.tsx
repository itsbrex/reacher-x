"use client";

/**
 * Mobile History Page
 *
 * Dedicated page for thread history on mobile devices.
 * Uses the same HistoryPanel component as desktop.
 */

import { useRouter } from "next/navigation";
import { useQueryStates, parseAsString } from "nuqs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAgentProspectQuery } from "@/features/agent/hooks";
import {
  PageLayout,
  PageHeader,
  PageContent,
} from "@/features/webapp/ui/components";
import { HistoryPanel } from "@/features/agent/ui/components";
import { useActiveUseCaseLabels, useWorkspace } from "@/shared/hooks";

export default function AgentHistoryPage() {
  const router = useRouter();
  const { entitySingular } = useActiveUseCaseLabels();
  const entitySingularLower = entitySingular.toLowerCase();
  const { workspace } = useWorkspace();

  // URL params via nuqs
  const [{ prospectId }] = useQueryStates({
    prospectId: parseAsString,
  });

  const createProspectThread = useMutation(api.chat.createProspectThread);
  const createWorkspaceThread = useMutation(api.chat.createWorkspaceThread);

  const prospectQuery = useAgentProspectQuery(prospectId);
  const prospectArchived = prospectQuery.data?.status === "archived";

  const handleNewThread = async () => {
    if (prospectId) {
      const result = await createProspectThread({
        prospectId: prospectId as Id<"prospects">,
      });
      router.push(
        `/agent?prospectId=${prospectId}&threadId=${result.threadId}`
      );
      return;
    }

    if (!workspace?._id) return;
    const result = await createWorkspaceThread({
      workspaceId: workspace._id,
    });
    router.push(`/agent?threadId=${result.threadId}`);
  };

  const handleSelectThread = (threadId: string) => {
    router.push(
      prospectId
        ? `/agent?prospectId=${prospectId}&threadId=${threadId}`
        : `/agent?threadId=${threadId}`
    );
  };

  const handleClose = () => {
    router.back();
  };

  if (!prospectId && !workspace?._id) {
    return (
      <PageLayout>
        <PageHeader title="History" onBack={handleClose} />
        <PageContent>
          <p className="text-muted-foreground py-8 text-center text-sm">
            No workspace or {entitySingularLower} selected
          </p>
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <HistoryPanel
      scope={
        prospectId
          ? {
              kind: "prospect",
              prospectId: prospectId as Id<"prospects">,
              prospectArchived,
            }
          : {
              kind: "workspace",
              workspaceId: workspace!._id,
            }
      }
      onClose={handleClose}
      onSelectThread={handleSelectThread}
      onNewThread={handleNewThread}
      className="max-w-none"
    />
  );
}
