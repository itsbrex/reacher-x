import {
  getBackendStatusBannerMessage,
  isBackendStatusBannerEnabled,
} from "@/shared/lib/backendStatusBanner";
import { WarningIcon } from "@/shared/ui/components/icons";

/**
 * Site-wide backend downtime notice. Visibility is controlled by
 * `NEXT_PUBLIC_BACKEND_STATUS_BANNER` (see `backendStatusBanner.ts`).
 */
export function BackendStatusBanner() {
  if (!isBackendStatusBannerEnabled()) {
    return null;
  }

  const message = getBackendStatusBannerMessage();

  return (
    <>
      <aside
        role="status"
        aria-live="polite"
        data-backend-status-banner-bar=""
        className="fixed inset-x-0 top-0 z-[200] border-b border-amber-900/15 bg-amber-100 text-amber-950 dark:border-amber-100/10 dark:bg-amber-950 dark:text-amber-50"
      >
        <div className="mx-auto flex w-full max-w-[1288px] items-center justify-center gap-2 px-4 py-2.5 text-center text-sm leading-snug font-medium">
          <WarningIcon
            className="size-4 shrink-0 fill-current text-amber-800 dark:text-amber-200"
            aria-hidden
          />
          <p>{message}</p>
        </div>
      </aside>
      {/* Reserve space so fixed chrome / page content is not covered */}
      <div className="h-10 shrink-0" aria-hidden />
    </>
  );
}
