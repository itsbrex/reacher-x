import "server-only";

import type { HandleAuthSuccessData } from "@workos-inc/authkit-nextjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import {
  resolvePostAuthSetupHref,
  type PostAuthBootstrapResult,
  type PostAuthBootstrapOperations,
  type PostAuthUserProfile,
} from "./postAuthBootstrapCore";

type AuthKitUser = HandleAuthSuccessData["user"];

function toPostAuthUserProfile(user: AuthKitUser): PostAuthUserProfile {
  return {
    workosUserId: user.id,
    email: user.email,
    firstName: user.firstName || undefined,
    lastName: user.lastName || undefined,
    profileImageUrl: user.profilePictureUrl || undefined,
  };
}

export async function bootstrapPostAuthSetup({
  accessToken,
  user,
}: {
  accessToken: string;
  user: AuthKitUser;
}): Promise<PostAuthBootstrapResult> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }

  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(accessToken);

  const operations: PostAuthBootstrapOperations = {
    upsertUser: (profile) =>
      client.mutation(api.users.createOrUpdateUser, profile),
    getSetupBootstrapState: () =>
      client.query(api.setupSessions.getSetupBootstrapState, {}),
    startFirstWorkspaceSetup: () =>
      client.mutation(api.setupSessions.startSetupSession, {
        mode: "first_workspace",
      }),
  };

  return await resolvePostAuthSetupHref(
    toPostAuthUserProfile(user),
    operations
  );
}
