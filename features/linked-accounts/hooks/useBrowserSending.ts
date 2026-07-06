"use client";

import { useCallback, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { logger } from "@/shared/lib/logger";
import { toast } from "sonner";

export type BrowserSendingStatus =
  | "not_configured"
  | "connected"
  | "needs_reconnect"
  | "disconnected";

export interface BrowserLoginSession {
  authConnectionId: string;
  hostedUrl: string;
  handoffCode: string | null;
}

/**
 * Browser sending (Kernel) connection state + actions for the connected
 * X account. Powers the "Enable browser sending" flow on Connected accounts.
 */
export function useBrowserSending({ enabled = true }: { enabled?: boolean }) {
  const statusData = useQuery(
    api.browserConnections.getBrowserSendingStatus,
    enabled ? {} : "skip"
  );
  const enableBrowserSending = useAction(
    api.browserConnectionActions.enableBrowserSending
  );
  const checkBrowserConnection = useAction(
    api.browserConnectionActions.checkBrowserConnection
  );
  const disableBrowserSending = useAction(
    api.browserConnectionActions.disableBrowserSending
  );

  const [loginSession, setLoginSession] = useState<BrowserLoginSession | null>(
    null
  );
  const [isMutating, setIsMutating] = useState(false);

  const status: BrowserSendingStatus = statusData?.status ?? "not_configured";
  const statusLoading = enabled && statusData === undefined;

  const handleEnable = useCallback(async () => {
    try {
      setIsMutating(true);
      const session = await enableBrowserSending({});
      setLoginSession(session);
    } catch (err) {
      logger.error("Failed to start browser sending setup:", err);
      toast.error("Unable to start browser sending setup", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsMutating(false);
    }
  }, [enableBrowserSending]);

  const handleVerify = useCallback(async () => {
    try {
      setIsMutating(true);
      const result = await checkBrowserConnection({});
      if (result.status === "connected") {
        toast.success("Browser sending enabled", {
          description:
            "The △ Agent can now send on X through your browser when the API blocks it.",
        });
        setLoginSession(null);
        return true;
      }
      toast.error("Browser sending is not verified yet", {
        description: "Finish logging into X, then try again.",
      });
      return false;
    } catch (err) {
      logger.error("Failed to verify browser sending:", err);
      toast.error("Unable to verify browser sending", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [checkBrowserConnection]);

  const handleDisable = useCallback(async () => {
    try {
      setIsMutating(true);
      await disableBrowserSending({});
      toast.success("Browser sending turned off");
    } catch (err) {
      logger.error("Failed to disable browser sending:", err);
      toast.error("Unable to turn off browser sending", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsMutating(false);
    }
  }, [disableBrowserSending]);

  const dismissLogin = useCallback(() => {
    setLoginSession(null);
  }, []);

  return {
    status,
    statusLoading,
    isMutating,
    loginSession,
    handleEnable,
    handleVerify,
    handleDisable,
    dismissLogin,
  };
}
