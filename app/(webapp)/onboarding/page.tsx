// Server-side gated page delegating to a client component to avoid flicker
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { withAuth } from "@workos-inc/authkit-nextjs";
import OnboardingClient from "./pageClient";

export default async function OnboardingPage() {
  // Authenticate server-side Convex call with WorkOS access token (when available)
  let token: string | null = null;
  try {
    const auth = await withAuth();
    token = auth?.accessToken ?? null;
  } catch {}

  const user = await fetchQuery(
    api.users.getCurrentUser,
    {},
    token ? { token } : undefined
  );
  const cookieStore = await cookies();
  const cookieDone = cookieStore.get("rx_onb")?.value === "1";
  const done = !!user?.onboardingCompletedAt || cookieDone;
  if (done) {
    redirect("/");
  }
  return <OnboardingClient />;
}
