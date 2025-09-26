import { authkitMiddleware } from "@workos-inc/authkit-nextjs";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

const workosMiddleware = authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [
      "/",
      "/login",
      "/logout",
      "/callback",
      "/home",
      "/home/threads",
      "/workspace",
      "/onboarding",
      "/api/onboarding/complete",
      "/api/onboarding/status",
      "/api/login",
      "/api/logout",
      "/api/callback",
      "/search",
      "/settings",
      "/settings/linked-accounts",
      "/customers",
      "/replies",
      "/api/x/connect",
      "/api/x/callback",
      "/api/x/session",
      "/api/x/encrypt",
      "/post/:tweetId",
    ],
  },
});

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  // Skip gating for any API routes
  if (pathname.startsWith("/api")) {
    const workosRes = await workosMiddleware(req, ev);
    return workosRes ?? NextResponse.next();
  }

  // Allow onboarding route itself
  const isOnboardingRoute =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  if (isOnboardingRoute) {
    const workosRes = await workosMiddleware(req, ev);
    return workosRes ?? NextResponse.next();
  }

  // Allow public landing pages (e.g., /home and its subroutes)
  const isLandingRoute = pathname === "/home" || pathname.startsWith("/home/");
  if (isLandingRoute) {
    const workosRes = await workosMiddleware(req, ev);
    return workosRes ?? NextResponse.next();
  }

  // Allow WorkOS auth routes to proceed without onboarding gating so login works
  const isAuthRoute =
    pathname === "/login" || pathname === "/callback" || pathname === "/logout";
  if (isAuthRoute) {
    const workosRes = await workosMiddleware(req, ev);
    return workosRes ?? NextResponse.next();
  }

  // If cookie set, allow through (but still run WorkOS and preserve result)
  const cookieDone = req.cookies.get("rx_onb")?.value === "1";
  if (!cookieDone) {
    // Check server onboarding status for authenticated users; if done, set cookie and allow
    try {
      const statusUrl = new URL("/api/onboarding/status", req.url);
      const statusRes = await fetch(statusUrl, {
        headers: { cookie: req.headers.get("cookie") || "" },
      });
      if (statusRes.ok) {
        const data = (await statusRes.json()) as { done?: boolean };
        if (!data?.done) {
          // Redirect to onboarding
          const url = req.nextUrl.clone();
          url.pathname = "/onboarding";
          url.search = "";
          return NextResponse.redirect(url);
        }
      } else {
        // If status check fails, err on the side of gating
        const url = req.nextUrl.clone();
        url.pathname = "/onboarding";
        url.search = "";
        return NextResponse.redirect(url);
      }
    } catch {
      // Network/edge error: gate to onboarding
      const url = req.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Allowed: run WorkOS middleware and return its response (preserving cookie if needed)
  const workosRes = await workosMiddleware(req, ev);
  return workosRes ?? NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
