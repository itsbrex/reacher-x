"use node";

import { randomUUID } from "node:crypto";
import { generateCodeChallenge, generateCodeVerifier } from "@xdevplatform/xdk";
import type { Id } from "../_generated/dataModel";
import { decryptXSecret, encryptXSecret } from "./xdkCrypto";
import {
  buildXClient,
  computeXTokenExpiry,
  createXOAuth2,
  exchangeXAuthorizationCode,
  getDefaultXRedirectUri,
  isReconnectRequiredXOAuthError,
  parseGrantedScopes,
  refreshXAccessToken,
} from "./xdkClient";
import {
  getXExecutionFailure,
  type XProviderContext,
} from "./xdkTwitterProvider";
import {
  buildStyleSourceKey,
  getNextStyleSourceVersion,
} from "./styleSourceCore";
import {
  buildDisconnectedXConnectionStatus,
  getMissingXScopes,
  type XAccountStatus,
  type XConnectionStatus,
  toStoredXConnectionStatus,
} from "./xConnectionStateCore";
import { X_CORE_SCOPES } from "./xScopes";
import { getCurrentUTCTimestamp } from "../../shared/lib/utils/time/timeUtils";
export type { XAccountStatus, XConnectionStatus } from "./xConnectionStateCore";

/** GET /2/users/me minimal identity fields — https://docs.x.com/x-api/users/get-my-user */
const X_USER_IDENTITY_FIELDS = [
  "id",
  "name",
  "username",
  "profile_image_url",
  "verified",
  "verified_type",
];

/** Best-effort metadata fields that should not block reconnect if X is flaky. */
const X_USER_SELF_METADATA_FIELDS = [
  ...X_USER_IDENTITY_FIELDS,
  "subscription_type",
  "subscription",
] as const;

const X_PROFILE_HYDRATION_RETRY_DELAYS_MS = [400, 1_200, 2_400] as const;

function parseXSubscriptionTypeForStored(
  raw: unknown
): "None" | "Basic" | "Premium" | "PremiumPlus" | undefined {
  if (
    raw === "None" ||
    raw === "Basic" ||
    raw === "Premium" ||
    raw === "PremiumPlus"
  ) {
    return raw;
  }
  return undefined;
}

function pickSubscriptionTypeFromMe(
  me: unknown
): "None" | "Basic" | "Premium" | "PremiumPlus" | undefined {
  const m = me as Record<string, unknown> | null | undefined;
  return parseXSubscriptionTypeForStored(
    m?.subscriptionType ?? m?.subscription_type
  );
}

type XStoreRefs = {
  getXAccountForUserInternal: unknown;
  upsertXAccountInternal: unknown;
  patchXAccountInternal: unknown;
  disconnectXAccountInternal: unknown;
  createXAuthSessionInternal: unknown;
  getXAuthSessionByStateInternal: unknown;
  completeXAuthSessionInternal: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

/** X API user objects may expose camelCase or snake_case for profile image. */
function pickProfileImageUrlFromMe(me: unknown): string | undefined {
  const m = me as Record<string, unknown> | null | undefined;
  return pickString(m?.profileImageUrl, m?.profile_image_url);
}

/** Legacy `verified` or X API v2 `verified_type` (blue, government, business, none). */
function pickVerifiedFromMe(me: unknown): boolean {
  const m = me as Record<string, unknown> | null | undefined;
  if (m?.verified === true) {
    return true;
  }
  const vt = m?.verified_type;
  if (typeof vt === "string" && vt.length > 0 && vt !== "none") {
    return true;
  }
  return false;
}

async function readXResponseBody(response: Response): Promise<unknown> {
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

function isHtmlLikeBody(body: unknown): boolean {
  return typeof body === "string" && /<(!doctype|html|body)\b/i.test(body);
}

function pickXResponseMessage(body: unknown): string | undefined {
  if (typeof body === "string") {
    if (isHtmlLikeBody(body)) {
      return undefined;
    }
    const trimmed = body.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 280) : undefined;
  }

  if (!isRecord(body)) {
    return undefined;
  }

  for (const key of [
    "detail",
    "message",
    "title",
    "error_description",
    "error",
  ]) {
    const value = body[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function buildXApiErrorMessage(args: {
  operation: string;
  response: Response;
  body: unknown;
}): string {
  const detail = pickXResponseMessage(args.body);

  if (args.response.status >= 500) {
    return `${args.operation} failed (${args.response.status} ${args.response.statusText}): X is temporarily unavailable. Please try again in a few minutes.`;
  }

  if (isHtmlLikeBody(args.body)) {
    return `${args.operation} failed (${args.response.status} ${args.response.statusText}): X returned an unexpected HTML error page.`;
  }

  return detail
    ? `${args.operation} failed (${args.response.status} ${args.response.statusText}): ${detail}`
    : `${args.operation} failed (${args.response.status} ${args.response.statusText}).`;
}

class XApiRequestError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;

  constructor(args: { operation: string; response: Response; body: unknown }) {
    super(buildXApiErrorMessage(args));
    this.name = "XApiRequestError";
    this.status = args.response.status;
    this.statusText = args.response.statusText;
    this.body = args.body;
  }
}

function shouldRetryXProfileHydration(error: unknown): boolean {
  if (!(error instanceof XApiRequestError)) {
    return false;
  }

  return (
    error.status === 401 ||
    error.status === 408 ||
    error.status === 429 ||
    error.status >= 500
  );
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchXUser(
  accessToken: string,
  args: {
    url: URL;
    operation: string;
  }
): Promise<Record<string, unknown>> {
  const response = await fetch(args.url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const body = await readXResponseBody(response);

  if (!response.ok) {
    throw new XApiRequestError({
      operation: args.operation,
      response,
      body,
    });
  }

  const user = isRecord(body) ? body.data : undefined;
  if (!isRecord(user)) {
    throw new Error(`${args.operation} returned an unexpected payload.`);
  }

  return user;
}

async function fetchCurrentXUserIdentity(
  accessToken: string
): Promise<Record<string, unknown>> {
  const url = new URL("https://api.x.com/2/users/me");
  url.searchParams.set("user.fields", [...X_USER_IDENTITY_FIELDS].join(","));
  return await fetchXUser(accessToken, {
    url,
    operation: "X GET /2/users/me",
  });
}

async function fetchCurrentXUserMetadata(
  accessToken: string
): Promise<Record<string, unknown>> {
  const url = new URL("https://api.x.com/2/users/me");
  url.searchParams.set(
    "user.fields",
    [...X_USER_SELF_METADATA_FIELDS].join(",")
  );
  return await fetchXUser(accessToken, {
    url,
    operation: "X GET /2/users/me",
  });
}

async function fetchXUserById(
  accessToken: string,
  userId: string
): Promise<Record<string, unknown>> {
  const url = new URL(
    `https://api.x.com/2/users/${encodeURIComponent(userId)}`
  );
  url.searchParams.set("user.fields", [...X_USER_IDENTITY_FIELDS].join(","));
  return await fetchXUser(accessToken, {
    url,
    operation: `X GET /2/users/${userId}`,
  });
}

async function fetchXUserByUsername(
  accessToken: string,
  username: string
): Promise<Record<string, unknown>> {
  const url = new URL(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}`
  );
  url.searchParams.set("user.fields", [...X_USER_IDENTITY_FIELDS].join(","));
  return await fetchXUser(accessToken, {
    url,
    operation: `X GET /2/users/by/username/${username}`,
  });
}

function mergePreferredXUserMetadata(
  identity: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Record<string, unknown> {
  if (!metadata) {
    return identity;
  }

  return {
    ...identity,
    ...metadata,
  };
}

async function fetchCurrentXUser(
  accessToken: string,
  fallbackAccount?: {
    xUserId?: unknown;
    username?: unknown;
  }
): Promise<Record<string, unknown>> {
  let lastError: unknown;

  for (const retryDelayMs of [0, ...X_PROFILE_HYDRATION_RETRY_DELAYS_MS]) {
    if (retryDelayMs > 0) {
      await delayMs(retryDelayMs);
    }

    try {
      const identity = await fetchCurrentXUserIdentity(accessToken);

      try {
        const metadata = await fetchCurrentXUserMetadata(accessToken);
        return mergePreferredXUserMetadata(identity, metadata);
      } catch (metadataError) {
        console.warn(
          "[xdkAuth] X self-profile metadata fetch failed after identity succeeded.",
          metadataError
        );
        return identity;
      }
    } catch (error) {
      lastError = error;
      if (!shouldRetryXProfileHydration(error)) {
        break;
      }
    }
  }

  const fallbackUserId = pickString(fallbackAccount?.xUserId);
  if (fallbackUserId) {
    try {
      console.warn(
        "[xdkAuth] Falling back to X user lookup by stored user ID after self-profile lookup failed."
      );
      return await fetchXUserById(accessToken, fallbackUserId);
    } catch (fallbackError) {
      lastError = fallbackError;
    }
  }

  const fallbackUsername = pickString(fallbackAccount?.username);
  if (fallbackUsername) {
    try {
      console.warn(
        "[xdkAuth] Falling back to X user lookup by stored username after self-profile lookup failed."
      );
      return await fetchXUserByUsername(accessToken, fallbackUsername);
    } catch (fallbackError) {
      lastError = fallbackError;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("X user profile lookup failed.");
}

function shouldRequireReconnectForRefreshFailure(
  failure: {
    classification: string;
  },
  error: unknown
): boolean {
  return (
    failure.classification === "reauth_required" ||
    failure.classification === "scope_missing" ||
    isReconnectRequiredXOAuthError(error)
  );
}

function canRetryReconnectStatus(account: {
  status: XAccountStatus;
  refreshToken?: string;
  lastRefreshError?: string;
}): boolean {
  if (account.status !== "reconnect_required" || !account.refreshToken) {
    return false;
  }

  const lastRefreshError =
    typeof account.lastRefreshError === "string"
      ? account.lastRefreshError.toLowerCase()
      : "";

  return (
    !lastRefreshError.includes("missing required scopes") &&
    !lastRefreshError.includes("refresh token is missing") &&
    !lastRefreshError.includes("token was invalid") &&
    !lastRefreshError.includes("authorization code")
  );
}

async function readStoredAccount(
  ctx: any,
  store: XStoreRefs,
  userId: Id<"users">
) {
  return await ctx.runQuery(store.getXAccountForUserInternal, { userId });
}

async function persistAccount(
  ctx: any,
  store: XStoreRefs,
  args: {
    userId: Id<"users">;
    xUserId: string;
    username: string;
    displayName?: string;
    profileImageUrl?: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
    grantedScopes: string[];
    tokenType: string;
    status: Exclude<XAccountStatus, "disconnected">;
    lastVerifiedAt?: number;
    lastRefreshAttemptAt?: number;
    lastRefreshError?: string;
    xSubscriptionType?: "None" | "Basic" | "Premium" | "PremiumPlus";
    xSubscriptionUpdatedAt?: number;
    xVerified?: boolean;
    activitySubscriptionStatus?:
      | "unknown"
      | "healthy"
      | "degraded"
      | "pending_retry";
    activitySubscriptionsEnsuredAt?: number;
    activitySubscriptionsLastAttemptAt?: number;
    activitySubscriptionsNextRetryAt?: number;
    activitySubscriptionsLastError?: string;
    activitySubscriptionsLastAuthMode?: "app" | "user";
  }
) {
  const now = getCurrentUTCTimestamp();
  const existingAccount = await readStoredAccount(ctx, store, args.userId);
  const styleSourceKey = buildStyleSourceKey("twitter", args.xUserId);
  const styleSourceVersion = getNextStyleSourceVersion({
    previousAccount: existingAccount,
    nextSourceKey: styleSourceKey,
    now,
  });
  const styleSourceSwitchedAt =
    existingAccount?.styleSourceVersion === styleSourceVersion
      ? existingAccount?.styleSourceSwitchedAt
      : now;
  await ctx.runMutation(store.upsertXAccountInternal, {
    ...args,
    styleSourceKey,
    styleSourceVersion,
    styleSourceSwitchedAt,
    accessToken: encryptXSecret(args.accessToken),
    refreshToken: args.refreshToken
      ? encryptXSecret(args.refreshToken)
      : undefined,
    now,
  });
}

async function patchAccount(
  ctx: any,
  store: XStoreRefs,
  userId: Id<"users">,
  patch: Record<string, unknown>
) {
  await ctx.runMutation(store.patchXAccountInternal, {
    userId,
    patch: {
      ...patch,
      updatedAt: getCurrentUTCTimestamp(),
    },
  });
}

export async function beginXAuthorizationForUser(
  ctx: any,
  store: XStoreRefs,
  args: {
    userId: Id<"users">;
    redirectUri?: string;
  }
): Promise<{ redirectUrl: string }> {
  const redirectUri = args.redirectUri ?? getDefaultXRedirectUri();
  const oauth2 = createXOAuth2({ redirectUri, scope: X_CORE_SCOPES });
  const state = randomUUID();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  await oauth2.setPkceParameters(codeVerifier, codeChallenge);

  const redirectUrl = await oauth2.getAuthorizationUrl(state);
  const now = getCurrentUTCTimestamp();
  await ctx.runMutation(store.createXAuthSessionInternal, {
    userId: args.userId,
    state,
    redirectUri,
    codeVerifier: encryptXSecret(codeVerifier),
    expiresAt: now + 15 * 60 * 1000,
  });

  return { redirectUrl };
}

export async function completeXAuthorizationForUser(
  ctx: any,
  store: XStoreRefs,
  args: {
    userId: Id<"users">;
    code: string;
    state: string;
  }
): Promise<XConnectionStatus> {
  const session = await ctx.runQuery(store.getXAuthSessionByStateInternal, {
    state: args.state,
  });
  if (!session || session.userId !== args.userId) {
    throw new Error(
      "X authorization session was not found or no longer valid."
    );
  }
  if (session.completedAt) {
    throw new Error("This X authorization session has already been used.");
  }
  if (session.expiresAt <= getCurrentUTCTimestamp()) {
    throw new Error("This X authorization session has expired. Start again.");
  }

  const existingAccount = await readStoredAccount(ctx, store, args.userId);
  const codeVerifier = decryptXSecret(session.codeVerifier);
  const token = await exchangeXAuthorizationCode({
    code: args.code,
    codeVerifier,
    redirectUri: session.redirectUri,
  });
  const me = await fetchCurrentXUser(token.access_token, existingAccount);
  const grantedScopes = parseGrantedScopes(token);
  const missingScopes = getMissingXScopes(grantedScopes);
  const now = getCurrentUTCTimestamp();
  const subType = pickSubscriptionTypeFromMe(me);
  const xSubscriptionType =
    subType ?? existingAccount?.xSubscriptionType ?? undefined;
  const xSubscriptionUpdatedAt =
    subType !== undefined
      ? now
      : (existingAccount?.xSubscriptionUpdatedAt as number | undefined);

  await persistAccount(ctx, store, {
    userId: args.userId,
    xUserId: String(me?.id ?? ""),
    username: pickString(me?.username) ?? "",
    displayName: pickString(me?.name),
    profileImageUrl: pickProfileImageUrlFromMe(me),
    xVerified: pickVerifiedFromMe(me),
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: computeXTokenExpiry(token.expires_in),
    grantedScopes,
    tokenType: token.token_type,
    status: missingScopes.length > 0 ? "reconnect_required" : "connected",
    lastVerifiedAt: now,
    lastRefreshAttemptAt: now,
    lastRefreshError:
      missingScopes.length > 0
        ? `Missing required scopes: ${missingScopes.join(", ")}`
        : undefined,
    xSubscriptionType,
    xSubscriptionUpdatedAt,
  });

  await ctx.runMutation(store.completeXAuthSessionInternal, {
    sessionId: session._id,
    completedAt: now,
  });

  const account = await readStoredAccount(ctx, store, args.userId);
  return account
    ? toStoredXConnectionStatus(account)
    : buildDisconnectedXConnectionStatus();
}

async function refreshXAccount(
  ctx: any,
  store: XStoreRefs,
  userId: Id<"users">,
  account: any
) {
  const refreshToken = account.refreshToken
    ? decryptXSecret(account.refreshToken)
    : undefined;

  if (!refreshToken) {
    await patchAccount(ctx, store, userId, {
      status: "reconnect_required",
      lastRefreshAttemptAt: getCurrentUTCTimestamp(),
      lastRefreshError: "Refresh token is missing.",
    });
    throw new Error("Reconnect required: refresh token is missing.");
  }

  const refreshAttemptAt = getCurrentUTCTimestamp();

  try {
    const refreshedToken = await refreshXAccessToken({
      refreshToken,
    });
    const grantedScopes = parseGrantedScopes(refreshedToken);
    const missingScopes = getMissingXScopes(grantedScopes);
    const refreshedExpiresAt = computeXTokenExpiry(refreshedToken.expires_in);
    const nextStatus =
      missingScopes.length > 0 ? "reconnect_required" : "connected";

    await persistAccount(ctx, store, {
      userId,
      xUserId: account.xUserId,
      username: account.username,
      displayName: account.displayName,
      profileImageUrl: account.profileImageUrl,
      xVerified: account.xVerified,
      accessToken: refreshedToken.access_token,
      refreshToken: refreshedToken.refresh_token ?? refreshToken,
      expiresAt: refreshedExpiresAt,
      grantedScopes,
      tokenType: refreshedToken.token_type,
      status: nextStatus,
      lastVerifiedAt: account.lastVerifiedAt,
      lastRefreshAttemptAt: refreshAttemptAt,
      lastRefreshError:
        missingScopes.length > 0
          ? `Missing required scopes: ${missingScopes.join(", ")}`
          : undefined,
      xSubscriptionType: account.xSubscriptionType,
      xSubscriptionUpdatedAt: account.xSubscriptionUpdatedAt,
    });

    const me = await fetchCurrentXUser(refreshedToken.access_token, account);
    const verifiedAt = getCurrentUTCTimestamp();
    const meSub = pickSubscriptionTypeFromMe(me);
    const xSubscriptionType =
      meSub !== undefined ? meSub : account.xSubscriptionType;
    const xSubscriptionUpdatedAt =
      meSub !== undefined
        ? verifiedAt
        : (account.xSubscriptionUpdatedAt as number | undefined);

    await persistAccount(ctx, store, {
      userId,
      xUserId: String(me?.id ?? account.xUserId),
      username: pickString(me?.username, account.username) ?? account.username,
      displayName: pickString(me?.name, account.displayName),
      profileImageUrl: pickProfileImageUrlFromMe(me) ?? account.profileImageUrl,
      xVerified: pickVerifiedFromMe(me),
      accessToken: refreshedToken.access_token,
      refreshToken: refreshedToken.refresh_token ?? refreshToken,
      expiresAt: refreshedExpiresAt,
      grantedScopes,
      tokenType: refreshedToken.token_type,
      status: nextStatus,
      lastVerifiedAt: verifiedAt,
      lastRefreshAttemptAt: refreshAttemptAt,
      lastRefreshError:
        missingScopes.length > 0
          ? `Missing required scopes: ${missingScopes.join(", ")}`
          : undefined,
      xSubscriptionType,
      xSubscriptionUpdatedAt,
    });
  } catch (error) {
    const failure = getXExecutionFailure(error);
    const reconnectRequired = shouldRequireReconnectForRefreshFailure(
      failure,
      error
    );
    const latestAccount = await readStoredAccount(ctx, store, userId);
    const tokenStillUsable =
      (latestAccount?.expiresAt ?? account.expiresAt) >
      getCurrentUTCTimestamp();
    const fallbackStatus =
      latestAccount?.status === "reconnect_required"
        ? "reconnect_required"
        : tokenStillUsable
          ? "connected"
          : "expired";
    await patchAccount(ctx, store, userId, {
      status: reconnectRequired ? "reconnect_required" : fallbackStatus,
      lastRefreshAttemptAt: refreshAttemptAt,
      lastRefreshError: failure.message,
    });
    throw error;
  }

  return await readStoredAccount(ctx, store, userId);
}

export async function getXConnectionStatusForUser(
  ctx: any,
  store: XStoreRefs,
  userId: Id<"users">
): Promise<XConnectionStatus> {
  let account = await readStoredAccount(ctx, store, userId);
  if (!account) {
    return buildDisconnectedXConnectionStatus();
  }

  if (account.status === "disconnected") {
    return buildDisconnectedXConnectionStatus();
  }

  const missingScopes = getMissingXScopes(account.grantedScopes ?? []);
  if (missingScopes.length > 0 && account.status !== "reconnect_required") {
    await patchAccount(ctx, store, userId, {
      status: "reconnect_required",
      lastRefreshError: `Missing required scopes: ${missingScopes.join(", ")}`,
    });
    account = await readStoredAccount(ctx, store, userId);
  }

  if (!account) {
    return buildDisconnectedXConnectionStatus();
  }

  const shouldRetryReconnect =
    missingScopes.length === 0 && canRetryReconnectStatus(account);
  const shouldRefresh =
    account.expiresAt <= getCurrentUTCTimestamp() + 60_000 ||
    account.status === "expired" ||
    shouldRetryReconnect;

  if (shouldRefresh) {
    try {
      account = await refreshXAccount(ctx, store, userId, account);
    } catch {
      account = await readStoredAccount(ctx, store, userId);
    }
  }

  if (!account) {
    return buildDisconnectedXConnectionStatus();
  }

  if (
    account.status === "connected" &&
    account.expiresAt <= getCurrentUTCTimestamp() &&
    account.status !== "reconnect_required"
  ) {
    await patchAccount(ctx, store, userId, {
      status: "expired",
    });
    account = await readStoredAccount(ctx, store, userId);
  }

  return account
    ? toStoredXConnectionStatus(account)
    : buildDisconnectedXConnectionStatus();
}

export async function disconnectXForUser(
  ctx: any,
  store: XStoreRefs,
  userId: Id<"users">
) {
  await ctx.runMutation(store.disconnectXAccountInternal, {
    userId,
    now: getCurrentUTCTimestamp(),
  });
}

export async function getXProviderContextForUser(
  ctx: any,
  store: XStoreRefs,
  args: {
    userId: Id<"users">;
    requiredScopes?: string[];
  }
): Promise<XProviderContext> {
  let account = await readStoredAccount(ctx, store, args.userId);
  if (!account) {
    throw new Error(
      "No X account is connected. Connect X in Settings -> Connected accounts."
    );
  }

  const missingScopes = (args.requiredScopes ?? []).filter(
    (scope) => !(account.grantedScopes ?? []).includes(scope)
  );
  if (missingScopes.length > 0) {
    await patchAccount(ctx, store, args.userId, {
      status: "reconnect_required",
      lastRefreshError: `Missing required scopes: ${missingScopes.join(", ")}`,
    });
    throw new Error(
      `Reconnect required: missing scopes ${missingScopes.join(", ")}.`
    );
  }

  const shouldRetryReconnect = canRetryReconnectStatus(account);
  if (
    account.status === "expired" ||
    account.expiresAt <= getCurrentUTCTimestamp() + 60_000 ||
    shouldRetryReconnect
  ) {
    account = await refreshXAccount(ctx, store, args.userId, account);
  }

  if (!account || account.status !== "connected") {
    throw new Error("Reconnect required: the stored X account is not active.");
  }

  return {
    client: buildXClient(decryptXSecret(account.accessToken)),
    xUserId: account.xUserId,
    username: account.username,
    connectedAccountId: String(account._id),
  };
}
