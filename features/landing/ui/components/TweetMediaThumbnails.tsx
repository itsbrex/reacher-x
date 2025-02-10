"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/shared/lib/utils/utils";
import { YoutubeIcon } from "@/shared/ui/components/icons/index";

export interface TweetMediaThumbnailsProps {
  media: any[];
  currentIndex?: number;
  onThumbnailClick?: (index: number) => void;
  className?: string;
}

export const TweetMediaThumbnails: React.FC<TweetMediaThumbnailsProps> = ({
  media,
  currentIndex = 0,
  onThumbnailClick,
  className,
}) => {
  if (!media || media.length === 0) return null;

  // Deduplicate media items based on their unique id_str.
  const dedupedMedia = media.filter(
    (item, index, self) =>
      index === self.findIndex((m) => m.id_str === item.id_str)
  );

  // Show the first two thumbnails.
  const thumbnailsToShow = dedupedMedia.slice(0, 2);
  const remainingCount = dedupedMedia.length - thumbnailsToShow.length;

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {thumbnailsToShow.map((item, index) => {
        // For video and animated GIF media, use the thumbnail provided by Twitter if available.
        const thumbnailUrl =
          (item.type === "video" || item.type === "animated_gif") &&
          item.thumbnails &&
          Array.isArray(item.thumbnails) &&
          item.thumbnails.length > 0
            ? item.thumbnails[0].url
            : item.media_url_https;

        return (
          <div
            key={item.id_str || index}
            // Mark container as "relative" to properly position the overlay.
            className={cn(
              "relative h-8 w-8 cursor-pointer rounded border border-border p-0.5 duration-100 hover:opacity-80",
              currentIndex === index && "border-2 border-primary"
            )}
            onClick={() => onThumbnailClick && onThumbnailClick(index)}
          >
            <Image
              src={thumbnailUrl}
              alt={item.ext_alt_text || "Tweet media"}
              width={32}
              height={32}
              className="h-full w-full rounded-[2px] object-cover"
            />
            {(item.type === "video" || item.type === "animated_gif") && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <YoutubeIcon className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        );
      })}
      {remainingCount > 0 && (
        <div
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-muted text-xs font-medium"
          onClick={() => onThumbnailClick && onThumbnailClick(2)}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};
