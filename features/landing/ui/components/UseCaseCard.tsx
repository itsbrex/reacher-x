"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import { ArrowForwardIcon } from "@/shared/ui/components/icons";
import type { UseCase } from "@/features/landing/lib/useCases";

/* -------------------------------------------------------------------------- */
/*  Hover-to-play video with lazy preload                                     */
/* -------------------------------------------------------------------------- */

function UseCaseVideo({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [preload, setPreload] = React.useState<"none" | "metadata">("none");

  // Upgrade preload when the card enters a 400px proximity zone
  React.useEffect(() => {
    const el = videoRef.current;
    if (!el || preload === "metadata") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setPreload("metadata");
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [preload]);

  // Desktop: play on pointer enter, pause on leave
  const handlePointerEnter = React.useCallback(() => {
    videoRef.current?.play().catch(() => {});
  }, []);
  const handlePointerLeave = React.useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  }, []);

  // Mobile: tap to toggle play/pause
  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      // Only handle for touch/coarse pointer devices
      if (window.matchMedia("(hover: hover)").matches) return;
      e.preventDefault();
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    },
    []
  );

  return (
    <div
      className={cn(
        "bg-muted relative aspect-[4/3] overflow-hidden",
        className
      )}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        loop
        preload={preload}
        aria-label={`${title} demo`}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

export function UseCaseCard({
  useCase,
  className,
}: {
  useCase: UseCase;
  className?: string;
}) {
  return (
    <article className={cn("group flex flex-col", className)}>
      <UseCaseVideo src={useCase.videoUrl} title={useCase.title} />

      <Link href={useCase.threadHref} className="block pt-4 pb-2">
        <h3 className="text-base font-semibold">{useCase.title}</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          {useCase.description}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium">
          See how
          <ArrowForwardIcon className="size-4 fill-current" />
        </span>
      </Link>
    </article>
  );
}
