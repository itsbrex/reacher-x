import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession } from "../../../../shared/lib/utils/sessionStorage";

// Exchange code for tokens and persist via Convex
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("x_oauth_state")?.value;
  const codeVerifier = cookieStore.get("x_code_verifier")?.value;

  // Clear cookies early
  cookieStore.delete("x_oauth_state");
  cookieStore.delete("x_code_verifier");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/linked-accounts?x_status=error_state`
    );
  }
  if (!codeVerifier) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/linked-accounts?x_status=missing_verifier`
    );
  }

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const tokenUrl =
    process.env.X_OAUTH_TOKEN_URL || "https://api.twitter.com/2/oauth2/token";
  const redirectUri =
    process.env.X_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/x/callback`;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/linked-accounts?x_status=server_misconfig`
    );
  }

  try {
    // X/Twitter OAuth 2.0 requires Basic Authentication
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );
    const tokenRequestData = {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    };

    const tokenResp = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams(tokenRequestData),
      cache: "no-store",
    });

    if (!tokenResp.ok) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/linked-accounts?x_status=token_error`
      );
    }

    const tokenJson = await tokenResp.json();
    const accessToken: string = tokenJson.access_token;
    const refreshToken: string | undefined = tokenJson.refresh_token;
    const expiresIn: number | undefined = tokenJson.expires_in;
    const tokenType: string | undefined = tokenJson.token_type;
    const scope: string | undefined = tokenJson.scope;

    // Fetch user identity from X
    const meResp = await fetch("https://api.twitter.com/2/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!meResp.ok) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/linked-accounts?x_status=user_fetch_error`
      );
    }
    const meJson = await meResp.json();
    const xUserId: string = meJson?.data?.id;
    const screenName: string | undefined = meJson?.data?.username;

    if (!xUserId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/settings/linked-accounts?x_status=invalid_user`
      );
    }

    // Store tokens in secure session instead of URL
    const tokenData = {
      accessToken,
      refreshToken,
      expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
      tokenType,
      scope,
      xUserId,
      screenName,
    };

    // Create secure session with token data
    const sessionId = await createSession(tokenData);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/linked-accounts?x_status=success&session=${sessionId}`
    );
  } catch (err) {
    console.error("X OAuth callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/linked-accounts?x_status=exception`
    );
  }
}
