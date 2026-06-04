"use client";

import Link from "next/link";
import type { UseCase } from "@/features/landing/lib/useCases";
import { cn } from "@/shared/lib/utils";
import { ArrowForwardIcon } from "@/shared/ui/components/icons";
import { LandingMuxHoverPlayer } from "./LandingMuxHoverPlayer";

export function UseCaseCard({
  useCase,
  className,
}: {
  useCase: UseCase;
  className?: string;
}) {
  return (
    <article className={cn("group flex flex-col", className)}>
      <LandingMuxHoverPlayer
        playbackId={useCase.videoPlaybackId}
        mp4Url={useCase.videoUrl}
        ariaLabel={`${useCase.title} demo`}
        className="aspect-[4/3]"
        loading="viewport"
        maxResolution="720p"
        sizes="(min-width: 1280px) 28vw, (min-width: 768px) 35vw, 75vw"
      />

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
