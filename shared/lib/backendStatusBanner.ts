/**
 * Public status banner for backend downtime / degraded service.
 *
 * Flip visibility with:
 *   NEXT_PUBLIC_BACKEND_STATUS_BANNER=true
 *
 * Optional copy override:
 *   NEXT_PUBLIC_BACKEND_STATUS_BANNER_MESSAGE="..."
 */

const TRUTHY = new Set(["1", "true", "yes", "on"]);

export function isBackendStatusBannerEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_BACKEND_STATUS_BANNER?.trim().toLowerCase();
  return raw != null && TRUTHY.has(raw);
}

export function getBackendStatusBannerMessage(): string {
  const override =
    process.env.NEXT_PUBLIC_BACKEND_STATUS_BANNER_MESSAGE?.trim();
  if (override) return override;
  return "Backend is temporarily unavailable. Some features may not work right now.";
}
