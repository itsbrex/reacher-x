import { redirect } from "next/navigation";
import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import type { NextRequest } from "next/server";
import { useLogger, withEvlog } from "@/shared/lib/logging/next";
import { resolveAuthReturnTo } from "@/shared/lib/urls/authRoutes";

export const GET = withEvlog(async (request: NextRequest) => {
  const log = useLogger();
  const returnTo = resolveAuthReturnTo(
    request.nextUrl.searchParams.get("returnTo")
  );
  log.set({
    auth: {
      action: "login_redirect",
      provider: "workos",
      return_to_path: returnTo,
    },
    operation: "login_route",
  });

  const authorizationUrl = await getSignInUrl({ returnTo });
  redirect(authorizationUrl);
});
