"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useConvex, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useNotificationWorkspace, useQueryWithStatus } from "@/shared/hooks";
import {
  PageContent,
  PageHeader,
  PageLayout,
} from "@/features/webapp/ui/components";
import { WorkspacePlanLimitAlert } from "@/features/billing/ui/components/WorkspacePlanLimitAlert";
import { NotificationsInbox } from "@/features/webapp/ui/components/notifications/NotificationsInbox";
import type { NotificationItem } from "@/features/webapp/ui/components/notifications/NotificationsInbox";
import { Button } from "@/shared/ui/components/Button";

const NOTIFICATIONS_BODY_COLUMN_CLASS_NAME =
  "flex min-h-0 flex-1 flex-col self-stretch overflow-hidden md:w-[min(32rem,100%)] md:max-w-lg md:flex-none md:self-start";

export default function NotificationsPage() {
  const router = useRouter();
  const convex = useConvex();
  const {
    error: notificationWorkspaceError,
    isLoading: isNotificationWorkspaceLoading,
    isReady: isNotificationWorkspaceReady,
    workspaceId,
    shellStateQuery,
  } = useNotificationWorkspace();

  const notificationsQuery = useQueryWithStatus(
    api.outreach.listNotifications,
    isNotificationWorkspaceReady && workspaceId
      ? { workspaceId: workspaceId as Id<"workspaces"> }
      : "skip"
  );
  const notifications = (
    notificationsQuery.isSuccess ? notificationsQuery.data : []
  ) as NotificationItem[];
  const markSeen = useMutation(api.outreach.markNotificationSeen);
  const dismissNotification = useMutation(api.outreach.dismissNotification);

  const isLoading =
    isNotificationWorkspaceLoading ||
    (workspaceId !== null && notificationsQuery.isPending);

  const handleSelect = async (
    notification: NotificationItem,
    rowNotifications: NotificationItem[]
  ) => {
    if (!workspaceId) {
      return;
    }

    const pendingNotifications = rowNotifications.filter(
      (item) => item.status === "pending"
    );

    for (const item of pendingNotifications) {
      await markSeen({
        notificationId: item._id as Id<"outreachNotifications">,
        workspaceId: workspaceId as Id<"workspaces">,
      });
    }

    const resolvedTargetHref = await convex.query(
      api.outreach.resolveNotificationTarget,
      {
        notificationId: notification._id as Id<"outreachNotifications">,
        workspaceId: workspaceId as Id<"workspaces">,
      }
    );

    if (resolvedTargetHref) {
      router.push(resolvedTargetHref);
      return;
    }

    if (!notification.prospectId) {
      return;
    }

    const params = new URLSearchParams();
    params.set("prospectId", notification.prospectId);

    if (notification.threadId) {
      params.set("threadId", notification.threadId);
    }

    if (notification.taskId) {
      params.set("taskId", notification.taskId);
      params.set("panel", "approval");
    }

    if (notification.actionRequestId) {
      params.set("actionRequestId", notification.actionRequestId);
      params.set("panel", "approval");
    }

    router.push(`/agent?${params.toString()}`);
  };

  const handleDismiss = async (notificationId: string) => {
    if (!workspaceId) {
      return;
    }

    await dismissNotification({
      notificationId: notificationId as Id<"outreachNotifications">,
      workspaceId: workspaceId as Id<"workspaces">,
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full">
      <PageLayout className="flex h-full min-h-0 max-w-none flex-col overflow-hidden border-r-0 md:border-r-0">
        <PageHeader title="Notifications" onBack={() => router.back()} />
        <div className={NOTIFICATIONS_BODY_COLUMN_CLASS_NAME}>
          <PageContent className="scroll-fade min-h-0 flex-1 overflow-y-auto pt-4 pb-6">
            <WorkspacePlanLimitAlert className="mx-4 mb-4" />
            {(notificationWorkspaceError ||
              shellStateQuery.isError ||
              notificationsQuery.isError) && (
              <div className="mx-4 mb-4 rounded-lg border border-dashed p-4 text-sm">
                <p className="font-medium">Could not load notifications</p>
                <p className="text-muted-foreground mt-1">
                  {notificationWorkspaceError?.message ||
                    shellStateQuery.error?.message ||
                    notificationsQuery.error?.message ||
                    "Please try again."}
                </p>
                <Button
                  size="xs"
                  variant="outline"
                  className="mt-3"
                  onClick={() => router.refresh()}
                >
                  Retry
                </Button>
              </div>
            )}
            <NotificationsInbox
              notifications={notifications}
              isLoading={isLoading}
              onSelect={handleSelect}
              onDismiss={handleDismiss}
            />
          </PageContent>
        </div>
      </PageLayout>
    </div>
  );
}
