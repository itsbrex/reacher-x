"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  VIDEO_ASSETS,
  type VideoAssetKey,
} from "@/features/landing/lib/videoAssets";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/components/Skeleton";

const LandingVideoPlayer = dynamic(() => import("./LandingVideoPlayer"), {
  ssr: false,
});

interface ThemedFigureVideoProps {
  videoAssetKey: VideoAssetKey;
  ariaLabel?: string;
  className?: string;
  figureClassName?: string;
  initialPreload?: "none" | "metadata";
}

export function ThemedFigureVideo({
  videoAssetKey,
  ariaLabel,
  className,
  figureClassName,
  initialPreload,
}: ThemedFigureVideoProps) {
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === "dark" ? "dark" : "light";
  const asset = VIDEO_ASSETS[videoAssetKey][mode];
  const posterUrl =
    "posterUrl" in asset ? (asset.posterUrl as string | undefined) : undefined;

  return (
    <figure
      className={cn(
        "relative aspect-square overflow-hidden",
        figureClassName
      )}
    >
      <div aria-hidden="true" className="absolute inset-0">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 640px, 100vw"
            className="object-cover"
          />
        ) : (
          <Skeleton className="h-full w-full" />
        )}
      </div>

      <div className="absolute inset-0">
        <LandingVideoPlayer
          mp4Url={asset.mp4Url}
          posterUrl={posterUrl}
          ariaLabel={ariaLabel}
          className={cn("h-full w-full", className)}
          initialPreload={initialPreload}
        />
      </div>
    </figure>
  );
}
