"use client";

/**
 * useOutreachNotificationToast
 * Hook to monitor outreach notifications and show Sonner toasts for new pending notifications.
 *
 * Per AGENT_CONTEXT.txt: Mirrors existing useReplyStatus pattern for consistency.
 */

import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  getOutreachNotificationEventKey,
  getOutreachNotificationEventTimestamp,
} from "@/shared/lib/notifications/outreachNotificationEvents";
import { useAuth } from "./useAuth";
import { useNotificationWorkspace } from "./useNotificationWorkspace";
import { useQueryWithStatus } from "./useQueryWithStatus";
import { getCurrentUTCTimestamp } from "../lib/utils/time/timeUtils";

type OutreachNotificationSummary = Omit<
  Pick<
    Doc<"outreachNotifications">,
    | "_creationTime"
    | "_id"
    | "actionLabel"
    | "actionRequestId"
    | "eventUpdatedAt"
    | "eventVersion"
    | "message"
    | "prospectId"
    | "status"
    | "targetHref"
    | "taskId"
    | "threadId"
    | "title"
    | "type"
  >,
  "_id" | "actionRequestId" | "prospectId" | "taskId"
> & {
  _id: string;
  actionRequestId?: string;
  prospectId?: string;
  taskId?: string;
};

type NotificationToastVariant = "info" | "success" | "warning" | "error";

function getNotificationToastVariant(
  type: Doc<"outreachNotifications">["type"]
): NotificationToastVariant {
  switch (type) {
    case "ask_human":
    case "twitter_action_request":
    case "social_action_request":
    case "plan_batch_ready":
    case "plan_batch_started":
      return "info";
    case "prospects_found":
    case "outreach_sent":
    case "prospect_replied":
    case "social_action_completed":
    case "setup_preview_ready":
    case "plan_completed":
    case "plan_batch_completed":
      return "success";
    case "plan_batch_partial":
      return "warning";
    case "social_action_failed":
    case "plan_batch_failed":
    case "error":
      return "error";
  }
}

/**
 * Shows Sonner toast notifications for new approval requests and prospect replies.
 * Tracks shown notifications to prevent duplicates across re-renders.
 */
export function useOutreachNotificationToast() {
  const convex = useConvex();
  const { isAuthenticated, isLoading } = useAuth();
  const { workspaceId, shellStateQuery } = useNotificationWorkspace();
  const workspaceSessionStartedAt = useMemo(
    () => getCurrentUTCTimestamp(),
    [workspaceId]
  );

  const notificationsQuery = useQueryWithStatus(
    api.outreach.listNotifications,
    isAuthenticated && workspaceId
      ? { workspaceId: workspaceId as Id<"workspaces"> }
      : "skip"
  );
  const notifications = useMemo<OutreachNotificationSummary[]>(
    () => (notificationsQuery.data ?? []) as OutreachNotificationSummary[],
    [notificationsQuery.data]
  );

  // Track shown notifications to prevent duplicate toasts
  const shownNotifications = useRef<Set<string>>(new Set());
  const baselineWorkspaceRef = useRef<string | null>(null);
  const baselineInitializedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || isLoading || shellStateQuery.isPending) {
      return;
    }

    const scopedWorkspaceId = workspaceId ?? null;
    if (baselineWorkspaceRef.current !== scopedWorkspaceId) {
      baselineWorkspaceRef.current = scopedWorkspaceId;
      baselineInitializedRef.current = false;
      shownNotifications.current.clear();
    }

    if (!scopedWorkspaceId || !notificationsQuery.isSuccess) {
      return;
    }

    // Only show toasts for new pending notifications
    const pending = notifications.filter(
      (n: OutreachNotificationSummary) => n.status === "pending"
    );

    if (!baselineInitializedRef.current) {
      for (const notification of pending) {
        if (
          getOutreachNotificationEventTimestamp(notification) <
          workspaceSessionStartedAt
        ) {
          shownNotifications.current.add(
            getOutreachNotificationEventKey(notification)
          );
        }
      }
      baselineInitializedRef.current = true;
    }

    for (const notification of pending) {
      const notificationEventKey =
        getOutreachNotificationEventKey(notification);
      // Skip if already shown
      if (shownNotifications.current.has(notificationEventKey)) continue;

      const targetHref =
        notification.targetHref ??
        (notification.prospectId
          ? (() => {
              const params = new URLSearchParams();
              params.set("prospectId", String(notification.prospectId));
              if (notification.threadId) {
                params.set("threadId", String(notification.threadId));
              }
              if (notification.taskId) {
                params.set("taskId", String(notification.taskId));
                params.set("panel", "approval");
              }
              if (notification.actionRequestId) {
                params.set(
                  "actionRequestId",
                  String(notification.actionRequestId)
                );
                params.set("panel", "approval");
              }
              return `/agent?${params.toString()}`;
            })()
          : undefined);

      const toastAction = targetHref
        ? {
            label: notification.actionLabel ?? "View",
            onClick: async () => {
              const resolvedTargetHref = await convex.query(
                api.outreach.resolveNotificationTarget,
                {
                  notificationId:
                    notification._id as Id<"outreachNotifications">,
                  workspaceId: workspaceId as Id<"workspaces">,
                }
              );
              window.location.href = resolvedTargetHref ?? targetHref;
            },
          }
        : undefined;

      const commonOptions = {
        id: notificationEventKey,
        duration: 8000, // Auto-dismiss after 8s
        action: toastAction,
      };

      const variant = getNotificationToastVariant(notification.type);
      toast[variant](notification.title, {
        description: notification.message,
        ...commonOptions,
      });

      // Mark as shown
      shownNotifications.current.add(notificationEventKey);
    }
  }, [
    isAuthenticated,
    isLoading,
    notifications,
    notificationsQuery.isSuccess,
    shellStateQuery.isPending,
    workspaceId,
    workspaceSessionStartedAt,
    convex,
  ]);
}
