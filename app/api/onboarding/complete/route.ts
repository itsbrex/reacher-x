import { NextResponse } from "next/server";

// POST endpoint used by programmatic calls (e.g., fetch). Sets cookie and returns 204.
export async function POST() {
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set("rx_onb", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

// GET endpoint used for navigation flow: hits this route, sets cookie, then redirects to "/".
export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.set("rx_onb", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
