import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { logger } from "../../../../shared/lib/logger";

/**
 * Encrypt OAuth tokens before storing in Convex
 *
 * This endpoint encrypts OAuth tokens using the Convex crypto actions
 * before they are stored in the database.
 */
export async function POST(request: Request) {
  try {
    const { accessToken, refreshToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    // Initialize Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Encrypt access token
    const encryptedAccessToken = await convex.action(
      api.cryptoActions.encryptToken,
      {
        token: accessToken,
      }
    );

    // Encrypt refresh token if provided
    let encryptedRefreshToken: string | undefined;
    if (refreshToken) {
      encryptedRefreshToken = await convex.action(
        api.cryptoActions.encryptToken,
        {
          token: refreshToken,
        }
      );
    }

    return NextResponse.json({
      success: true,
      encryptedAccessToken,
      encryptedRefreshToken,
    });
  } catch (error) {
    logger.error("Token encryption error:", error);
    return NextResponse.json(
      { error: "Failed to encrypt tokens" },
      { status: 500 }
    );
  }
}
