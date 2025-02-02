"use client";

import React from "react";
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
} from "media-chrome/react";

interface VideoPlayerProps {
  hlsUrl?: string;
  mp4Url?: string;
  ariaLabel?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  hlsUrl,
  mp4Url,
  ariaLabel,
  ...props
}) => {
  return (
    <MediaController {...props} className="w-full overflow-hidden rounded-lg">
      <video
        slot="media"
        className="h-full w-full object-cover"
        aria-label={ariaLabel}
      >
        {hlsUrl && <source src={hlsUrl} type="application/x-mpegURL" />}
        {mp4Url && <source src={mp4Url} type="video/mp4" />}
        {/* You can add additional source tags for hlsUrl or other formats if needed */}
        Your browser does not support HTML5 video.
      </video>

      <MediaLoadingIndicator slot="centered-chrome" noautohide />

      <MediaControlBar>
        <MediaPlayButton />
        <MediaSeekBackwardButton />
        <MediaSeekForwardButton />
        <MediaTimeRange />
        <MediaTimeDisplay showDuration remaining />
        <MediaMuteButton />
        <MediaVolumeRange />
      </MediaControlBar>
    </MediaController>
  );
};

export default VideoPlayer;
