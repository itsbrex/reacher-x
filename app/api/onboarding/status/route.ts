import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function GET() {
  try {
    const user = await fetchQuery(api.users.getCurrentUser, {});
    const done = !!user?.onboardingCompletedAt;
    return NextResponse.json({ done });
  } catch {
    return NextResponse.json({ done: false }, { status: 200 });
  }
}
