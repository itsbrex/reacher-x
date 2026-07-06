"use node";

/**
 * Kernel browser automation core (Layer 3).
 *
 * One Kernel profile per connected X account keeps the logged-in x.com
 * session. A Kernel managed-auth connection health-checks the session and
 * lets the user re-authenticate inside ReacherX when needed. Browser
 * sends run in short-lived stealth sessions loaded with the profile,
 * execute Playwright code, and capture a proof screenshot.
 */

import Kernel from "@onkernel/sdk";

const X_DOMAIN = "x.com";
const BROWSER_SESSION_TIMEOUT_SECONDS = 180;
const PLAYWRIGHT_TIMEOUT_SECONDS = 120;

let kernelClient: Kernel | null = null;

export function getKernelClient(): Kernel {
  if (!kernelClient) {
    const apiKey = process.env.KERNEL_API_KEY;
    if (!apiKey) {
      throw new Error(
        "KERNEL_API_KEY is not configured. Set it via `npx convex env set`."
      );
    }
    kernelClient = new Kernel({ apiKey });
  }
  return kernelClient;
}

export function buildKernelProfileName(xAccountId: string): string {
  return `reacherx-x-${xAccountId}`;
}

export interface KernelLoginStart {
  authConnectionId: string;
  hostedUrl: string;
  handoffCode?: string;
  flowExpiresAt: string;
}

/**
 * Create (or reuse) the managed-auth connection for an X account's profile
 * and start a login flow. Returns the hosted URL + handoff code used by the
 * embedded managed-auth UI.
 */
export async function startXBrowserLogin(
  profileName: string
): Promise<KernelLoginStart> {
  const client = getKernelClient();

  let authConnectionId: string | null = null;
  try {
    const created = await client.auth.connections.create({
      domain: X_DOMAIN,
      profile_name: profileName,
      login_url: "https://x.com/i/flow/login",
      record_session: true,
      save_credentials: false,
      auto_reauth: false,
    });
    authConnectionId = created.id;
  } catch (error) {
    // 409 means a connection already exists for this profile+domain — reuse it.
    if (error instanceof Kernel.APIError && error.status === 409) {
      const existing = await client.auth.connections.list({
        profile_name: profileName,
        domain: X_DOMAIN,
      });
      for await (const connection of existing) {
        authConnectionId = connection.id;
        break;
      }
    }
    if (!authConnectionId) {
      throw error;
    }
  }

  const login = await client.auth.connections.login(authConnectionId);

  return {
    authConnectionId,
    hostedUrl: login.hosted_url,
    handoffCode: login.handoff_code,
    flowExpiresAt: login.flow_expires_at,
  };
}

export interface KernelConnectionState {
  status: "AUTHENTICATED" | "NEEDS_AUTH";
  flowStatus: string | null;
  lastAuthCheckAt?: string;
}

export async function getXBrowserConnectionState(
  authConnectionId: string
): Promise<KernelConnectionState> {
  const client = getKernelClient();
  const connection = await client.auth.connections.retrieve(authConnectionId);
  return {
    status: connection.status,
    flowStatus: connection.flow_status ?? null,
    lastAuthCheckAt: connection.last_auth_check_at,
  };
}

export async function deleteXBrowserConnection(
  authConnectionId: string
): Promise<void> {
  const client = getKernelClient();
  try {
    await client.auth.connections.delete(authConnectionId);
  } catch (error) {
    if (error instanceof Kernel.APIError && error.status === 404) {
      return;
    }
    throw error;
  }
}

export type BrowserXActionKind =
  | "reply_to_post"
  | "create_post"
  | "like_post"
  | "follow_user";

export interface BrowserXActionInput {
  kind: BrowserXActionKind;
  /** Target tweet id for reply/like. */
  tweetId?: string;
  /** Target username (without @) for follow. */
  targetUsername?: string;
  /** Text for reply/post. */
  text?: string;
}

export interface BrowserXActionResult {
  success: boolean;
  error?: string;
  /** Base64-encoded PNG proof screenshot taken after the action. */
  proofScreenshotBase64?: string;
  /** True when the session appears logged out — the connection needs re-auth. */
  loggedOut?: boolean;
  replayViewUrl?: string;
}

function escapeForTemplate(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

/**
 * Build the Playwright script for the requested action. The script runs in
 * Kernel's VM with `page` in scope. It uses human-like randomized pacing and
 * returns { ok, loggedOut, error, screenshot } as JSON.
 */
function buildXActionScript(input: BrowserXActionInput): string {
  const targetUrl =
    input.kind === "follow_user"
      ? `https://x.com/${input.targetUsername ?? ""}`
      : input.kind === "create_post"
        ? "https://x.com/home"
        : `https://x.com/i/status/${input.tweetId ?? ""}`;

  const text = escapeForTemplate(input.text ?? "");

  const actionSteps =
    input.kind === "reply_to_post"
      ? `
  await page.click('[data-testid="reply"]');
  await pause(900, 1800);
  const composer = page.locator('[data-testid="tweetTextarea_0"]');
  await composer.waitFor({ state: "visible", timeout: 15000 });
  await composer.click();
  await pause(400, 900);
  await composer.pressSequentially(\`${text}\`, { delay: 35 + Math.floor(Math.random() * 40) });
  await pause(800, 1600);
  await page.click('[data-testid="tweetButton"]');
  await pause(2500, 4000);`
      : input.kind === "create_post"
        ? `
  const composer = page.locator('[data-testid="tweetTextarea_0"]');
  await composer.waitFor({ state: "visible", timeout: 15000 });
  await composer.click();
  await pause(400, 900);
  await composer.pressSequentially(\`${text}\`, { delay: 35 + Math.floor(Math.random() * 40) });
  await pause(800, 1600);
  await page.click('[data-testid="tweetButtonInline"]');
  await pause(2500, 4000);`
        : input.kind === "like_post"
          ? `
  const likeButton = page.locator('[data-testid="like"]').first();
  await likeButton.waitFor({ state: "visible", timeout: 15000 });
  await pause(500, 1200);
  await likeButton.click();
  await pause(1200, 2200);`
          : `
  const followButton = page.locator('[data-testid$="-follow"]').first();
  await followButton.waitFor({ state: "visible", timeout: 15000 });
  await pause(500, 1200);
  await followButton.click();
  await pause(1200, 2200);`;

  return `
const pause = async (min, max) => {
  await page.waitForTimeout(min + Math.floor(Math.random() * (max - min)));
};

const takeProof = async () => {
  const buffer = await page.screenshot({ type: "png" });
  return buffer.toString("base64");
};

try {
  await page.goto(${JSON.stringify(targetUrl)}, { waitUntil: "domcontentloaded", timeout: 45000 });
  await pause(1800, 3200);

  const loginWall = await page
    .locator('[data-testid="loginButton"], [data-testid="login"], a[href="/login"]')
    .first()
    .isVisible()
    .catch(() => false);
  if (loginWall) {
    return { ok: false, loggedOut: true, error: "Browser session is logged out of X.", screenshot: await takeProof() };
  }
${actionSteps}

  return { ok: true, screenshot: await takeProof() };
} catch (error) {
  let screenshot;
  try {
    screenshot = await takeProof();
  } catch {}
  return { ok: false, error: String(error && error.message ? error.message : error), screenshot };
}
`;
}

/**
 * Execute an X action through a short-lived Kernel browser session loaded
 * with the account's profile. The session is always cleaned up.
 */
export async function executeXBrowserAction(args: {
  profileName: string;
  input: BrowserXActionInput;
}): Promise<BrowserXActionResult> {
  const client = getKernelClient();

  const session = await client.browsers.create({
    profile: { name: args.profileName, save_changes: true },
    stealth: true,
    headless: true,
    timeout_seconds: BROWSER_SESSION_TIMEOUT_SECONDS,
  });

  try {
    const execution = await client.browsers.playwright.execute(
      session.session_id,
      {
        code: buildXActionScript(args.input),
        timeout_sec: PLAYWRIGHT_TIMEOUT_SECONDS,
      }
    );

    if (!execution.success) {
      return {
        success: false,
        error: execution.error || "Browser execution failed.",
      };
    }

    const result = execution.result as
      | {
          ok?: boolean;
          loggedOut?: boolean;
          error?: string;
          screenshot?: string;
        }
      | undefined;

    return {
      success: Boolean(result?.ok),
      error: result?.error,
      loggedOut: Boolean(result?.loggedOut),
      proofScreenshotBase64: result?.screenshot,
    };
  } finally {
    try {
      await client.browsers.deleteByID(session.session_id);
    } catch (cleanupError) {
      console.warn("[KernelCore] Failed to delete browser session", {
        sessionId: session.session_id,
        error:
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError),
      });
    }
  }
}
