"use client";

import { useOpenGraphPreview } from "@/shared/hooks/useOpenGraphPreview";
import { cn } from "@/shared/lib/utils/utils";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { Button } from "@/shared/ui/components/Button";
import {
  AutorenewIcon,
  CloseIcon,
  LinkIcon,
} from "@/shared/ui/components/icons";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";

interface OpenGraphPreviewProps {
  url: string;
  className?: string;
  onRemove?: () => void;
  debounceMs?: number;
  enableCache?: boolean;
  retryOnError?: boolean;
}

export function OpenGraphPreview({
  url,
  className,
  onRemove,
  debounceMs = 500,
  enableCache = true,
  retryOnError = true,
}: OpenGraphPreviewProps) {
  const { data, loading, error, fromCache, clearError, refetch } =
    useOpenGraphPreview(url, {
      debounceMs,
      enableCache,
      retryOnError,
    });

  const [imageError, setImageError] = useState(false);

  // Show loading skeleton
  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div
          className="relative w-full overflow-hidden rounded-md border border-border/50"
          style={{ aspectRatio: "16 / 9" }}
        >
          <Skeleton className="absolute inset-0 h-full w-full animate-pulse" />
        </div>
        <div className="mt-2 flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 animate-pulse" />
            <Skeleton className="h-3 w-1/2 animate-pulse" />
            <Skeleton className="h-3 w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (error) {
    return (
      <div className={cn("space-y-3", className)}>
        <div
          className="relative w-full overflow-hidden rounded-md border border-destructive/20 bg-destructive/5"
          style={{ aspectRatio: "16 / 9" }}
        >
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-sm text-red-500">
                Failed to load preview
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  clearError();
                  refetch();
                }}
                className="text-xs"
              >
                <AutorenewIcon className="fill-current" />
                Retry
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-start gap-4">
          <div className="flex items-center gap-1">
            <LinkIcon className="fill-current" />
            <Link
              className="font-mono text-sm text-muted-foreground hover:underline"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {url}
            </Link>
          </div>
          {onRemove && (
            <Button
              variant="outline"
              size="xsIcon"
              onClick={onRemove}
              className="ml-auto"
            >
              <CloseIcon className="fill-current" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Don't show if no data or insufficient data
  if (!data || (!data.image && !data.title)) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Media Preview - matching MediaUploadSection design */}
      <div
        className="group relative w-full overflow-hidden rounded-md border border-border/50"
        style={{ aspectRatio: "16 / 9" }}
      >
        {data.image && !imageError ? (
          <Image
            src={data.image}
            alt={data.title ?? "preview"}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => setImageError(true)}
            priority={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <div className="text-center text-muted-foreground">
              <div className="text-sm">No preview available</div>
            </div>
          </div>
        )}

        {/* Remove Button - matching MediaUploadSection */}
        {onRemove && (
          <Button
            variant="outline"
            size="xsIcon"
            onClick={onRemove}
            className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <CloseIcon className="fill-current" />
          </Button>
        )}

        {/* External Link Button */}
        <Button
          variant="outline"
          size="xsIcon"
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <LinkIcon className="fill-current" />
        </Button>
      </div>

      {/* Content - matching MediaUploadSection layout */}
      <div className="mt-2 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {data.siteName && (
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {data.siteName}
            </div>
          )}
          {data.title && (
            <div className="mt-1 line-clamp-2 text-sm font-medium">
              {data.title}
            </div>
          )}
          {data.description && (
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {data.description}
            </div>
          )}
          <div className="mt-2 truncate text-xs text-muted-foreground">
            {url}
          </div>
        </div>

        {/* Cache indicator */}
        {fromCache && (
          <div className="shrink-0 text-xs text-muted-foreground/60">
            cached
          </div>
        )}
      </div>
    </div>
  );
}
