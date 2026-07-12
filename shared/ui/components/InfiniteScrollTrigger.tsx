"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/components/Button";
import { useScrollAreaViewportRef } from "@/shared/ui/components/ScrollArea";
import { cn } from "@/shared/lib/utils";

const DEFAULT_PRELOAD_DISTANCE = 600;

type InfiniteScrollTriggerProps = {
  hasMore: boolean;
  isLoading: boolean;
  loadMoreError?: boolean;
  onLoadMore: () => void;
  resultCount: number;
  className?: string;
  preloadDistance?: number;
};

/**
 * Loads the next page shortly before this sentinel reaches its ScrollArea
 * viewport. Outside a ScrollArea, it observes the browser viewport instead.
 */
function InfiniteScrollTrigger({
  hasMore,
  isLoading,
  loadMoreError = false,
  onLoadMore,
  resultCount,
  className,
  preloadDistance = DEFAULT_PRELOAD_DISTANCE,
}: InfiniteScrollTriggerProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollAreaViewportRef = useScrollAreaViewportRef();
  const onLoadMoreRef = useRef(onLoadMore);
  const [observerUnavailable, setObserverUnavailable] = useState(false);

  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!hasMore || isLoading || loadMoreError) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    if (typeof IntersectionObserver === "undefined") {
      setObserverUnavailable(true);
      return;
    }

    let requested = false;
    let animationFrame: number | null = null;
    const root = scrollAreaViewportRef?.current ?? null;
    const requestMore = () => {
      if (requested) return;
      requested = true;
      onLoadMoreRef.current();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        requestMore();
      },
      {
        root,
        rootMargin: `0px 0px ${preloadDistance}px 0px`,
        threshold: 0,
      }
    );

    const checkScrollDistance = () => {
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        const remainingDistance = root
          ? root.scrollHeight - root.scrollTop - root.clientHeight
          : document.documentElement.scrollHeight -
            window.scrollY -
            window.innerHeight;

        if (remainingDistance <= preloadDistance) {
          requestMore();
        }
      });
    };
    const scrollTarget: EventTarget = root ?? window;

    observer.observe(sentinel);
    scrollTarget.addEventListener("scroll", checkScrollDistance, {
      passive: true,
    });
    checkScrollDistance();

    return () => {
      observer.disconnect();
      scrollTarget.removeEventListener("scroll", checkScrollDistance);
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [
    hasMore,
    isLoading,
    loadMoreError,
    preloadDistance,
    resultCount,
    scrollAreaViewportRef,
  ]);

  const showVisibleFallback = loadMoreError || observerUnavailable;

  return (
    <div
      ref={sentinelRef}
      data-slot="infinite-scroll-trigger"
      data-state={
        loadMoreError
          ? "error"
          : isLoading
            ? "loading"
            : hasMore
              ? "ready"
              : "exhausted"
      }
      className={cn(
        "relative h-px w-full",
        showVisibleFallback && "h-auto pt-2",
        className
      )}
    >
      {isLoading ? (
        <span role="status" aria-live="polite" className="sr-only">
          Loading more results
        </span>
      ) : showVisibleFallback ? (
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="w-full"
          onClick={onLoadMore}
        >
          {loadMoreError ? "Retry loading more" : "Load more"}
        </Button>
      ) : hasMore ? (
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="sr-only focus:not-sr-only focus:absolute focus:inset-x-0 focus:top-2 focus:z-20 focus:w-full"
          onClick={onLoadMore}
        >
          Load more results
        </Button>
      ) : null}
    </div>
  );
}

export { InfiniteScrollTrigger };
