// components/MediaViewerDrawer.tsx
"use client";

import React, { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/ui/components/Drawer";
import { Button } from "@/shared/ui/components/Button";
import Image from "next/image";
import VideoPlayer from "./VideoPlayer";

interface MediaViewerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: any[];
  initialIndex?: number;
}

const MediaViewerDrawer: React.FC<MediaViewerDrawerProps> = ({
  open,
  onOpenChange,
  media,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Compute each media’s original aspect ratio.
  const getRatio = (item: any) => {
    if (item.original_info) {
      return item.original_info.width / item.original_info.height;
    }
    return 16 / 9;
  };

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
          className="object-contain"
        />
      );
    }
    return null;
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="p-4">
        <DrawerHeader>
          <DrawerTitle>Media Viewer</DrawerTitle>
        </DrawerHeader>
        {/* Media selectors (thumbnails) */}
        <div className="mb-4 flex items-center space-x-2 overflow-x-auto">
          {media.slice(0, 3).map((item, index) => (
            <div
              key={item.id_str || index}
              onClick={() => setCurrentIndex(index)}
              className={`relative cursor-pointer rounded ${currentIndex === index ? "border-2 border-primary" : ""}`}
            >
              <Image
                src={item.media_url_https}
                alt={item.ext_alt_text || "Tweet image"}
                width={50}
                height={50}
                className="rounded object-cover"
              />
            </div>
          ))}
          {media.length > 3 && (
            <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-sm font-medium">
              +{media.length - 3}
            </div>
          )}
        </div>
        {/* Main media display area */}
        <div className="relative">
          <div className="mx-auto w-full">
            <div
              style={{ aspectRatio: getRatio(media[currentIndex]) }}
              className="w-full"
            >
              {renderMediaItem(media[currentIndex])}
            </div>
          </div>
          {/* Navigation Controls */}
          <div className="absolute inset-0 flex items-center justify-between px-4">
            <Button onClick={handlePrev} variant="outline" size="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="sr-only">Previous</span>
            </Button>
            <div className="text-sm text-muted-foreground">
              {currentIndex + 1}/{media.length}
            </div>
            <Button onClick={handleNext} variant="outline" size="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="sr-only">Next</span>
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MediaViewerDrawer;
