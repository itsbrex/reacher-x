"use client";

import * as React from "react";
import Image from "next/image";
import MuxPlayer from "@mux/mux-player-react/lazy";
import { getMuxPosterUrl } from "@/features/landing/lib/muxVideo";
import { cn } from "@/shared/lib/utils";
import { type LandingPlayableMediaElement } from "./LandingAutoPlayProvider";
import { useAutoPlayOnVisible } from "../hooks/useAutoPlayOnVisible";
import { useMuxPlaybackIdStatus } from "../hooks/useMuxPlaybackIdStatus";

interface LandingMuxBackgroundVideoProps {
  playbackId?: string;
  mp4Url?: string;
  ariaLabel?: string;
  className?: string;
  posterUrl?: string;
  posterTime?: number;
  initialPreload?: "none" | "metadata";
  autoPlayOnVisible?: boolean;
  maxResolution?: "720p" | "1080p";
  sizes?: string;
}

export function LandingMuxBackgroundVideo({
  playbackId,
  mp4Url,
  ariaLabel,
  className,
  posterUrl,
  posterTime = 0,
  initialPreload = "none",
  autoPlayOnVisible = true,
  maxResolution = "720p",
  sizes = "(min-width: 768px) 640px, 100vw",
}: LandingMuxBackgroundVideoProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const videoRef = React.useRef<React.ElementRef<typeof MuxPlayer> | null>(
    null
  );
  const [shouldLoad, setShouldLoad] = React.useState(
    initialPreload === "metadata"
  );
  const playbackStatus = useMuxPlaybackIdStatus(playbackId);
  const canUseMux = playbackStatus === "valid" && !!playbackId;

  useAutoPlayOnVisible(
    videoRef as React.RefObject<LandingPlayableMediaElement | null>,
    {
      enabled: autoPlayOnVisible && shouldLoad && canUseMux,
    }
  );

  React.useEffect(() => {
    if (shouldLoad) return;

    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting || (entry?.intersectionRatio ?? 0) > 0) {
          setShouldLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [shouldLoad]);

  const muxPosterUrl = canUseMux
    ? getMuxPosterUrl(playbackId, {
        time: posterTime,
        width: 1600,
      })
    : null;
  const resolvedPosterUrl = muxPosterUrl ?? posterUrl;

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-muted relative h-full w-full overflow-hidden",
        className
      )}
    >
      {resolvedPosterUrl ? (
        <Image
          src={resolvedPosterUrl}
          alt=""
          aria-hidden="true"
          fill
          priority={initialPreload === "metadata"}
          sizes={sizes}
          className="object-cover"
        />
      ) : null}

      {shouldLoad && canUseMux ? (
        <MuxPlayer
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ "--controls": "none" }}
          playbackId={playbackId}
          playbackRates={[]}
          thumbnailTime={posterTime}
          poster={resolvedPosterUrl ?? undefined}
          placeholder={resolvedPosterUrl ?? undefined}
          title=""
          videoTitle=""
          metadataVideoTitle=""
          streamType="on-demand"
          maxResolution={maxResolution}
          muted
          autoPlay
          loop
          playsInline
          nohotkeys
          noVolumePref
          noMutedPref
          preload={initialPreload === "metadata" ? "auto" : "metadata"}
          aria-label={ariaLabel}
        />
      ) : null}

      {shouldLoad && !canUseMux && mp4Url ? (
        <video
          aria-label={ariaLabel}
          className="absolute inset-0 h-full w-full object-cover"
          src={mp4Url}
          muted
          autoPlay
          loop
          playsInline
          preload={initialPreload}
        />
      ) : null}
    </div>
  );
}
