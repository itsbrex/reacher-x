import type { ReactNode } from "react";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { ConvexClientProviderClient } from "./ConvexClientProviderClient";

export async function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { accessToken: _accessToken, ...initialAuth } = await withAuth();

  return (
    <ConvexClientProviderClient initialAuth={initialAuth}>
      {children}
    </ConvexClientProviderClient>
  );
}
