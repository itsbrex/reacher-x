import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { withAuth } from "@workos-inc/authkit-nextjs";

export async function GET() {
  try {
    // Authenticate server-side Convex call with WorkOS access token
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
    const done = !!user?.onboardingCompletedAt;
    return NextResponse.json({ done });
  } catch {
    return NextResponse.json({ done: false }, { status: 200 });
  }
}
