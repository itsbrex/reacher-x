// Server-side gated page delegating to a client component to avoid flicker
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import OnboardingClient from "./pageClient";

export default async function OnboardingPage() {
  const user = await fetchQuery(api.users.getCurrentUser, {});
  const cookieStore = await cookies();
  const cookieDone = cookieStore.get("rx_onb")?.value === "1";
  const done = !!user?.onboardingCompletedAt || cookieDone;
  if (done) {
    redirect("/");
  }
  return <OnboardingClient />;
}
