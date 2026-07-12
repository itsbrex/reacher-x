import { handleAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest } from "next/server";
import { useLogger, withEvlog } from "@/shared/lib/logging/next";
import { bootstrapPostAuthSetup } from "@/shared/lib/auth/postAuthBootstrap";
import {
  applyPostAuthRedirect,
  type PostAuthBootstrapResult,
} from "@/shared/lib/auth/postAuthBootstrapCore";

export const GET = withEvlog(async (request: NextRequest) => {
  const log = useLogger();
  let bootstrapResult: PostAuthBootstrapResult | null = null;
  log.set({
    auth: {
      action: "callback",
      provider: "workos",
    },
    operation: "auth_callback_route",
  });

  const authHandler = handleAuth({
    onSuccess: async ({ accessToken, user }) => {
      try {
        bootstrapResult = await bootstrapPostAuthSetup({ accessToken, user });
        log.set({
          auth: {
            post_auth_destination:
              bootstrapResult.setupHref ?? "requested_return_to",
          },
        });
      } catch (error) {
        // Authentication itself succeeded. Preserve AuthKit's requested return
        // destination and let the existing client recovery path handle a
        // temporary Convex bootstrap failure rather than failing the callback.
        log.error(
          error instanceof Error
            ? error
            : new Error("Post-auth setup bootstrap failed")
        );
      }
    },
  });

  const response = await authHandler(request);
  return applyPostAuthRedirect(response, request.url, bootstrapResult);
});
