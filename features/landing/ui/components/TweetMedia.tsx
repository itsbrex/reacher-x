// components/TweetMedia.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/shared/ui/components/Carousel";
import { AspectRatio } from "@/shared/ui/components/AspectRatio";
import { Button } from "@/shared/ui/components/Button";
import VideoPlayer from "./VideoPlayer";
import MediaViewerDrawer from "./MediaViewerDrawer";

interface TweetMediaProps {
  media: any[];
}

const TweetMedia: React.FC<TweetMediaProps> = ({ media }) => {
  if (!media || media.length === 0) return null;

  // State for the "View All" drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);

  // Compute a standard aspect ratio from the first media item.
  let aspectRatio = 16 / 9; // fallback
  const firstMedia = media[0];
  if (firstMedia && firstMedia.original_info) {
    aspectRatio =
      firstMedia.original_info.width / firstMedia.original_info.height;
  }

  const renderMediaItem = (item: any) => {
    if (item.type === "video" || item.type === "animated_gif") {
      const variants = item.video_info?.variants || [];
      const hlsVariant = variants.find(
        (v: any) => v.content_type === "application/x-mpegURL"
      );
      const mp4Variants = variants.filter(
        (v: any) => v.content_type === "video/mp4"
      );
      const mp4Variant = mp4Variants.reduce(
        (prev: any, curr: any) =>
          (prev.bitrate || 0) > (curr.bitrate || 0) ? prev : curr,
        {}
      );
      return (
        <VideoPlayer
          hlsUrl={hlsVariant?.url}
          mp4Url={mp4Variant?.url}
          ariaLabel="Tweet video"
        />
      );
    } else if (item.type === "photo") {
      return (
        <Image
          src={item.media_url_https}
          alt={item.ext_alt_text || "Tweet image"}
          width={item.original_info.width}
          height={item.original_info.height}
          className="w-full object-cover"
        />
      );
    }
    return null;
  };

  // If a single media item, simply render it.
  if (media.length === 1) {
    return (
      <AspectRatio ratio={aspectRatio}>{renderMediaItem(media[0])}</AspectRatio>
    );
  }

  // More than one media: render a Carousel with a "View All" button.
  return (
    <div className="bg-orange-500">
      <Carousel>
        <CarouselContent>
          {media.map((item, index) => (
            <CarouselItem key={item.id_str || index}>
              <AspectRatio ratio={aspectRatio}>
                {renderMediaItem(item)}
              </AspectRatio>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="mt-2 flex items-center justify-end">
        <Button
          onClick={() => {
            setInitialIndex(0);
            setDrawerOpen(true);
          }}
          variant="ghost"
          size="sm"
        >
          View All
        </Button>
      </div>
      <MediaViewerDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        media={media}
        initialIndex={initialIndex}
      />
    </div>
  );
};

export default TweetMedia;
