"use client";

import React from "react";
import { cn } from "@/shared/lib/utils/utils";
import {
  MediaController,
  MediaControlBar,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaMuteButton,
  MediaVolumeRange,
  MediaLoadingIndicator,
  MediaFullscreenButton,
} from "media-chrome/react";

interface VideoPlayerProps {
  hlsUrl?: string;
  mp4Url?: string;
  ariaLabel?: string;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  hlsUrl,
  mp4Url,
  ariaLabel,
  className,
  ...props
}) => {
  return (
    <MediaController
      {...props}
      className={cn("h-full w-full overflow-hidden", className)}
    >
      <video
        slot="media"
        className="h-full w-full object-contain" // changed from object-cover to object-contain
        aria-label={ariaLabel}
      >
        {hlsUrl && <source src={hlsUrl} type="application/x-mpegURL" />}
        {mp4Url && <source src={mp4Url} type="video/mp4" />}
        Your browser does not support HTML5 video.
      </video>

      <MediaLoadingIndicator slot="centered-chrome" noautohide />

      <MediaControlBar>
        <MediaPlayButton />
        <MediaTimeRange />
        <MediaTimeDisplay showDuration remaining />
        <MediaMuteButton />
        <MediaFullscreenButton />
      </MediaControlBar>
    </MediaController>
  );
};

export default VideoPlayer;
