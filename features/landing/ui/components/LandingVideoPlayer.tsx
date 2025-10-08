"use client";

import React from "react";
import { cn } from "@/shared/lib/utils/utils";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { useAutoPlayOnVisible } from "../hooks/useAutoPlayOnVisible";
import "media-chrome/react";
import "media-chrome/react/menu";
import { MediaTheme } from "media-chrome/react/media-theme";

interface LandingVideoPlayerProps {
  hlsUrl?: string;
  mp4Url?: string;
  ariaLabel?: string;
  className?: string;
  autoPlayOnVisible?: boolean;
  muted?: boolean;
}

type MediaThemeElementLike = HTMLElement & { template?: HTMLTemplateElement };

const LandingVideoPlayer: React.FC<LandingVideoPlayerProps> = ({
  hlsUrl,
  mp4Url,
  ariaLabel,
  className,
  autoPlayOnVisible = true,
  muted = true,
  ...props
}) => {
  const [loaded, setLoaded] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const attachTemplate = React.useCallback((el: Element | null) => {
    if (!el) return;
    const tmpl =
      typeof document !== "undefined"
        ? (document.getElementById(
            "media-theme-landing"
          ) as HTMLTemplateElement | null)
        : null;
    if (tmpl) {
      (el as unknown as MediaThemeElementLike).template = tmpl;
    }
  }, []);

  useAutoPlayOnVisible(videoRef, { enabled: autoPlayOnVisible });

  return (
    <div className={cn("relative h-full w-full", className)}>
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full" />}
      <MediaTheme
        ref={attachTemplate}
        className={cn("h-full w-full overflow-hidden", className)}
        style={{ "--media-accent-color": "#ffffff" } as React.CSSProperties}
        {...props}
      >
        <video
          slot="media"
          className="h-full w-full object-contain"
          aria-label={ariaLabel}
          playsInline
          preload="none"
          crossOrigin="anonymous"
          muted={muted}
          ref={videoRef}
          onLoadedMetadata={() => setLoaded(true)}
        >
          {hlsUrl && <source src={hlsUrl} type="application/x-mpegURL" />}
          {mp4Url && <source src={mp4Url} type="video/mp4" />}
          Your browser does not support HTML5 video.
        </video>
      </MediaTheme>
    </div>
  );
};

export default LandingVideoPlayer;
