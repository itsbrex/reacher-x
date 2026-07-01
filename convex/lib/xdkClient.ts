"use node";

import {
  Client,
  OAuth2,
  type OAuth2Config,
  type OAuth2Token,
} from "@xdevplatform/xdk";
import { getCurrentUTCTimestamp } from "../../shared/lib/utils/time/timeUtils";
import { XDK_PACKAGE_VERSION } from "./xdkConstants";
import { X_CORE_SCOPES } from "./xScopes";

export { XDK_PACKAGE_VERSION };
export { X_CORE_SCOPES, type XScope } from "./xScopes";

const X_OAUTH_TOKEN_URL = "https://api.x.com/2/oauth2/token";

type XResponseBody = Record<string, unknown> | string | null;

function getRequiredEnv(
  name: "X_API_CLIENT_ID" | "X_API_CLIENT_SECRET" | "X_API_BEARER_TOKEN"
): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set in the Convex environment.`);
  }
  return value;
}

export function getXApiClientSecret(): string {
  return getRequiredEnv("X_API_CLIENT_SECRET");
}

export function getXAppBearerToken(): string {
  return getRequiredEnv("X_API_BEARER_TOKEN");
}

export function getDefaultXRedirectUri(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (!siteUrl) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. It is required to build the X OAuth redirect URI."
    );
  }

  return `${siteUrl}/settings/connected-accounts`;
}

export function buildXOAuth2Config(options?: {
  redirectUri?: string;
  scope?: readonly string[];
}): OAuth2Config {
  return {
    clientId: getRequiredEnv("X_API_CLIENT_ID"),
    clientSecret: getRequiredEnv("X_API_CLIENT_SECRET"),
    redirectUri: options?.redirectUri ?? getDefaultXRedirectUri(),
    scope: [...(options?.scope ?? X_CORE_SCOPES)],
  };
}

export function createXOAuth2(options?: {
  redirectUri?: string;
  scope?: readonly string[];
}): OAuth2 {
  return new OAuth2(buildXOAuth2Config(options));
}

export function buildXClient(accessToken: string): Client {
  return new Client({
    accessToken,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickStringProperty(
  value: XResponseBody,
  key: string
): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const property = value[key];
  return typeof property === "string" && property.trim().length > 0
    ? property.trim()
    : undefined;
}

function isHtmlLikeBody(value: XResponseBody): boolean {
  return typeof value === "string" && /<(!doctype|html|body)\b/i.test(value);
}

function pickResponseMessage(value: XResponseBody): string | undefined {
  if (typeof value === "string") {
    if (isHtmlLikeBody(value)) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 280) : undefined;
  }

  for (const key of [
    "error_description",
    "detail",
    "message",
    "title",
    "error",
  ]) {
    const property = pickStringProperty(value, key);
    if (property) {
      return property;
    }
  }

  return undefined;
}

async function readResponseBody(response: Response): Promise<XResponseBody> {
  const rawBody = await response.text();
  const trimmedBody = rawBody.trim();

  if (trimmedBody.length === 0) {
    return null;
  }

  try {
    return JSON.parse(trimmedBody) as Record<string, unknown>;
  } catch {
    return trimmedBody;
  }
}

function buildOAuthErrorMessage(args: {
  operation: string;
  status: number;
  statusText: string;
  body: XResponseBody;
}): string {
  const errorCode = pickStringProperty(args.body, "error");
  const errorDescription = pickStringProperty(args.body, "error_description");
  const fallbackMessage = pickResponseMessage(args.body);

  const detail =
    errorCode && errorDescription
      ? `${errorCode}: ${errorDescription}`
      : (errorDescription ?? fallbackMessage);

  if (args.status >= 500) {
    return `${args.operation} failed (${args.status} ${args.statusText}): X is temporarily unavailable. Please try again in a few minutes.`;
  }

  if (isHtmlLikeBody(args.body)) {
    return `${args.operation} failed (${args.status} ${args.statusText}): X returned an unexpected HTML error page.`;
  }

  return detail
    ? `${args.operation} failed (${args.status} ${args.statusText}): ${detail}`
    : `${args.operation} failed (${args.status} ${args.statusText}).`;
}

export class XOAuthRequestError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly error: string | undefined;
  readonly errorDescription: string | undefined;
  readonly body: XResponseBody;

  constructor(args: {
    operation: string;
    status: number;
    statusText: string;
    body: XResponseBody;
  }) {
    super(buildOAuthErrorMessage(args));
    this.name = "XOAuthRequestError";
    this.status = args.status;
    this.statusText = args.statusText;
    this.error = pickStringProperty(args.body, "error");
    this.errorDescription = pickStringProperty(args.body, "error_description");
    this.body = args.body;
  }
}

function normalizeOAuthToken(body: XResponseBody): OAuth2Token {
  if (!isRecord(body)) {
    throw new Error("X OAuth token endpoint returned an unexpected payload.");
  }

  const accessToken = pickStringProperty(body, "access_token");
  const tokenType = pickStringProperty(body, "token_type");
  const refreshToken = pickStringProperty(body, "refresh_token");
  const scope = pickStringProperty(body, "scope");
  const expiresInRaw = body.expires_in;
  const expiresIn =
    typeof expiresInRaw === "number"
      ? expiresInRaw
      : typeof expiresInRaw === "string"
        ? Number(expiresInRaw)
        : Number.NaN;

  if (
    !accessToken ||
    !tokenType ||
    !Number.isFinite(expiresIn) ||
    expiresIn < 0
  ) {
    throw new Error(
      "X OAuth token endpoint returned an invalid token payload."
    );
  }

  return {
    access_token: accessToken,
    token_type: tokenType,
    expires_in: expiresIn,
    refresh_token: refreshToken,
    scope,
  };
}

async function requestXOAuthToken(args: {
  operation: string;
  params: URLSearchParams;
}): Promise<OAuth2Token> {
  const clientId = getRequiredEnv("X_API_CLIENT_ID");
  const clientSecret = getRequiredEnv("X_API_CLIENT_SECRET");
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch(X_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: args.params.toString(),
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new XOAuthRequestError({
      operation: args.operation,
      status: response.status,
      statusText: response.statusText,
      body,
    });
  }

  return normalizeOAuthToken(body);
}

export async function exchangeXAuthorizationCode(args: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<OAuth2Token> {
  const params = new URLSearchParams({
    client_id: getRequiredEnv("X_API_CLIENT_ID"),
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: args.redirectUri,
  });
  params.append("code_verifier", args.codeVerifier);

  return await requestXOAuthToken({
    operation: "X OAuth code exchange",
    params,
  });
}

export async function refreshXAccessToken(args: {
  refreshToken: string;
}): Promise<OAuth2Token> {
  const params = new URLSearchParams({
    client_id: getRequiredEnv("X_API_CLIENT_ID"),
    grant_type: "refresh_token",
    refresh_token: args.refreshToken,
  });

  return await requestXOAuthToken({
    operation: "X OAuth token refresh",
    params,
  });
}

export function isReconnectRequiredXOAuthError(error: unknown): boolean {
  if (!(error instanceof XOAuthRequestError)) {
    return false;
  }

  const normalizedCode = error.error?.toLowerCase();
  const normalizedDescription = (
    error.errorDescription ??
    pickResponseMessage(error.body) ??
    error.message
  ).toLowerCase();

  return (
    normalizedCode === "invalid_grant" ||
    (normalizedCode === "invalid_request" &&
      (normalizedDescription.includes("token was invalid") ||
        normalizedDescription.includes("authorization code") ||
        normalizedDescription.includes("code verifier")))
  );
}

export function computeXTokenExpiry(expiresInSeconds: number): number {
  return getCurrentUTCTimestamp() + expiresInSeconds * 1000;
}

export function parseGrantedScopes(token: OAuth2Token): string[] {
  return (token.scope ?? "")
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}
