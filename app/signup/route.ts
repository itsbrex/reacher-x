import { redirect } from "next/navigation";
import { getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { useLogger, withEvlog } from "@/shared/lib/logging/next";
import { SETUP_AUTH_RETURN_TO } from "@/shared/lib/urls/authRoutes";

export const GET = withEvlog(async () => {
  const log = useLogger();
  log.set({
    auth: {
      action: "signup_redirect",
      provider: "workos",
      return_to_path: SETUP_AUTH_RETURN_TO,
    },
    operation: "signup_route",
  });

  const authorizationUrl = await getSignUpUrl({
    returnTo: SETUP_AUTH_RETURN_TO,
  });
  redirect(authorizationUrl);
});
