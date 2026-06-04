"use client";

import * as React from "react";
import { getMuxPosterUrl } from "@/features/landing/lib/muxVideo";

export type MuxPlaybackIdStatus = "idle" | "checking" | "valid" | "invalid";

const playbackIdStatusCache = new Map<
  string,
  Exclude<MuxPlaybackIdStatus, "idle">
>();

export function useMuxPlaybackIdStatus(playbackId?: string | null) {
  const [status, setStatus] = React.useState<MuxPlaybackIdStatus>(
    playbackId ? (playbackIdStatusCache.get(playbackId) ?? "checking") : "idle"
  );

  React.useEffect(() => {
    if (!playbackId) {
      setStatus("idle");
      return;
    }

    const cachedStatus = playbackIdStatusCache.get(playbackId);
    if (cachedStatus) {
      setStatus(cachedStatus);
      return;
    }

    let cancelled = false;
    setStatus("checking");

    const image = new Image();
    image.onload = () => {
      if (!cancelled) {
        playbackIdStatusCache.set(playbackId, "valid");
        setStatus("valid");
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        playbackIdStatusCache.set(playbackId, "invalid");
        setStatus("invalid");
      }
    };
    image.src = getMuxPosterUrl(playbackId, { time: 0, width: 320 });

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [playbackId]);

  return status;
}
