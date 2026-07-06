"use client";

import React from "react";
import dynamic from "next/dynamic";
import "@onkernel/managed-auth-react/styles.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/components/Dialog";
import type { BrowserLoginSession } from "@/features/linked-accounts/hooks/useBrowserSending";

const KernelManagedAuth = dynamic(
  () => import("@onkernel/managed-auth-react").then((m) => m.KernelManagedAuth),
  { ssr: false }
);

/** Kernel managed-auth styled with our design tokens. */
const MANAGED_AUTH_APPEARANCE = {
  variables: {
    colorPrimary: "hsl(var(--primary))",
    colorPrimaryForeground: "hsl(var(--primary-foreground))",
    colorBackground: "hsl(var(--background))",
    colorForeground: "hsl(var(--foreground))",
    colorMuted: "hsl(var(--muted))",
    colorMutedForeground: "hsl(var(--muted-foreground))",
    colorCard: "hsl(var(--card))",
    colorCardForeground: "hsl(var(--card-foreground))",
    colorBorder: "hsl(var(--border))",
    colorRing: "hsl(var(--ring))",
    colorDanger: "hsl(var(--destructive))",
    colorDangerForeground: "hsl(var(--destructive-foreground))",
    borderRadius: "var(--radius)",
    fontFamily: "inherit",
    shadow: "none",
  },
  elements: {
    root: { background: "transparent", padding: 0, minHeight: "auto" },
    shell: { padding: 0 },
    card: {
      border: "none",
      boxShadow: "none",
      padding: 0,
      background: "transparent",
    },
  },
  layout: {
    poweredByKernel: true,
    skipPrimeStep: true,
  },
} as const;

export interface BrowserSendingDialogProps {
  session: BrowserLoginSession | null;
  onSuccess: () => void;
  onClose: () => void;
}

/**
 * In-app X login for browser sending. The user signs into X directly with
 * Kernel's managed auth — credentials never touch ReacherX.
 */
export function BrowserSendingDialog({
  session,
  onSuccess,
  onClose,
}: BrowserSendingDialogProps) {
  return (
    <Dialog
      open={session !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enable browser sending</DialogTitle>
          <DialogDescription>
            Sign in to X below. Your password goes straight to X — ReacherX
            never sees or stores it. After this one-time step, the △ Agent can
            send through your browser whenever X blocks the API.
          </DialogDescription>
        </DialogHeader>
        {session !== null && session.handoffCode ? (
          <KernelManagedAuth
            sessionId={session.authConnectionId}
            handoffCode={session.handoffCode}
            appearance={MANAGED_AUTH_APPEARANCE}
            onSuccess={onSuccess}
            onError={onClose}
          />
        ) : session !== null ? (
          <FallbackHostedLogin hostedUrl={session.hostedUrl} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Shown when the embedded flow has no handoff code — open the hosted page. */
function FallbackHostedLogin({ hostedUrl }: { hostedUrl: string }) {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        Finish signing in to X in the secure window, then come back here and
        verify the connection.
      </p>
      <a
        href={hostedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors"
      >
        Open secure X login
      </a>
    </div>
  );
}
