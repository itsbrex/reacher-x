"use client";

import { type ReactNode, useCallback } from "react";
import { ConvexProviderWithAuth } from "convex/react";
import {
  AuthKitProvider,
  useAccessToken,
  useAuth as useWorkosAuth,
} from "@workos-inc/authkit-nextjs/components";
import type { NoUserInfo, UserInfo } from "@workos-inc/authkit-nextjs";
import { convex } from "@/shared/lib/convex";

export type AuthKitInitialAuth = Omit<UserInfo | NoUserInfo, "accessToken">;

export function ConvexClientProviderClient({
  children,
  initialAuth,
}: {
  children: ReactNode;
  initialAuth: AuthKitInitialAuth;
}) {
  return (
    <AuthKitProvider initialAuth={initialAuth}>
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromWorkos}>
        {children}
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  );
}

function useAuthFromWorkos() {
  const { user, loading: isLoading } = useWorkosAuth();
  const { refresh, getAccessToken } = useAccessToken();

  // Keep Convex's auth provider state tied to the stable WorkOS session only.
  // Token fetch/refresh loading is handled inside fetchAccessToken; exposing it
  // here makes Convex reset auth on every token refresh, which causes UI flicker.
  const loading = isLoading ?? false;
  const authenticated = !!user;

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        const token = forceRefreshToken
          ? await refresh()
          : await getAccessToken();
        return token ?? null;
      } catch {
        return null;
      }
    },
    [getAccessToken, refresh]
  );

  return {
    isLoading: loading,
    isAuthenticated: authenticated,
    fetchAccessToken,
  };
}
