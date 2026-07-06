"use node";

import type { Doc, Id } from "./_generated/dataModel";
import { action } from "./lib/functionBuilders";
import { api, internal } from "./_generated/api";
import {
  buildKernelProfileName,
  deleteXBrowserConnection,
  getXBrowserConnectionState,
  startXBrowserLogin,
} from "./lib/kernelCore";

async function getCurrentUserId(ctx: any): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const user = await ctx.runQuery(api.users.getUserByWorkosId, {
    workosUserId: identity.subject,
  });
  if (!user) {
    throw new Error("User not found");
  }
  return user._id as Id<"users">;
}

async function requireConnectedXAccount(
  ctx: any,
  userId: Id<"users">
): Promise<Doc<"xAccounts">> {
  const account = await ctx.runQuery(
    internal.xStore.getXAccountForUserInternal,
    {
      userId,
    }
  );
  if (!account) {
    throw new Error(
      "Connect your X account first, then enable browser sending."
    );
  }
  return account as Doc<"xAccounts">;
}

/**
 * Start (or restart) the browser sending connection flow for the user's
 * connected X account. Returns the Kernel managed-auth login handles the
 * client uses to render the in-app login (never our servers touching
 * credentials).
 */
export const enableBrowserSending = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    authConnectionId: string;
    hostedUrl: string;
    handoffCode: string | null;
  }> => {
    const userId = await getCurrentUserId(ctx);
    const xAccount = await requireConnectedXAccount(ctx, userId);

    const profileName = buildKernelProfileName(String(xAccount._id));
    const login = await startXBrowserLogin(profileName);

    await ctx.runMutation(
      internal.browserConnections.upsertBrowserConnectionInternal,
      {
        userId,
        xAccountId: xAccount._id,
        kernelProfileName: profileName,
        authConnectionId: login.authConnectionId,
        status: "needs_reconnect",
      }
    );

    return {
      authConnectionId: login.authConnectionId,
      hostedUrl: login.hostedUrl,
      handoffCode: login.handoffCode ?? null,
    };
  },
});

/**
 * Poll Kernel for the connection's auth state and sync our record.
 * Called after the in-app login completes (or to re-verify later).
 */
export const checkBrowserConnection = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    status: "connected" | "needs_reconnect" | "not_configured";
  }> => {
    const userId = await getCurrentUserId(ctx);
    const connection = await ctx.runQuery(
      internal.browserConnections.getBrowserConnectionForUserInternal,
      { userId }
    );
    if (!connection) {
      return { status: "not_configured" };
    }

    const state = await getXBrowserConnectionState(connection.authConnectionId);
    const status =
      state.status === "AUTHENTICATED" ? "connected" : "needs_reconnect";

    await ctx.runMutation(
      internal.browserConnections.setBrowserConnectionStatusInternal,
      { connectionId: connection._id, status }
    );

    return { status };
  },
});

/** Turn off browser sending and remove the Kernel managed-auth connection. */
export const disableBrowserSending = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean }> => {
    const userId = await getCurrentUserId(ctx);
    const connection = await ctx.runQuery(
      internal.browserConnections.getBrowserConnectionForUserInternal,
      { userId }
    );
    if (!connection) {
      return { success: true };
    }

    await deleteXBrowserConnection(connection.authConnectionId);
    await ctx.runMutation(
      internal.browserConnections.setBrowserConnectionStatusInternal,
      { connectionId: connection._id, status: "disconnected" }
    );

    return { success: true };
  },
});
