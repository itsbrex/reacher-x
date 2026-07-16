"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/shared/lib/utils";
import { useTouchPrimary } from "@/shared/ui/hooks/use-has-primary-touch";

type ScrollAreaContextValue = {
  isTouch: boolean;
  viewportRef: React.RefObject<HTMLDivElement | null>;
};

const ScrollAreaContext = React.createContext<ScrollAreaContextValue | null>(
  null
);

type ScrollAreaProps = React.ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.Root
> & {
  viewportClassName?: string;
  viewportOverscrollClassName?: string;
  scrollbar?: "vertical" | "horizontal" | "both" | "none";
};

const ScrollArea = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(
  (
    {
      className,
      children,
      scrollHideDelay = 0,
      viewportClassName,
      viewportOverscrollClassName,
      scrollbar = "vertical",
      ...props
    },
    ref
  ) => {
    const resolvedOverscrollClassName =
      viewportOverscrollClassName ??
      (scrollbar === "horizontal"
        ? "overscroll-x-contain overscroll-y-auto"
        : "overscroll-contain");
    const viewportRef = React.useRef<HTMLDivElement>(null);
    const isTouch = useTouchPrimary();
    const scrollFadeClassName =
      scrollbar === "horizontal"
        ? "scroll-fade-x"
        : scrollbar === "both"
          ? "scroll-fade scroll-fade-x"
          : "scroll-fade";

    const contextValue = React.useMemo(
      () => ({ isTouch, viewportRef }),
      [isTouch]
    );

    if (isTouch) {
      return (
        <ScrollAreaContext.Provider value={contextValue}>
          <div
            ref={ref}
            role="group"
            data-slot="scroll-area"
            aria-roledescription="scroll area"
            className={cn("relative overflow-hidden", className)}
            {...props}
          >
            <div
              ref={viewportRef}
              data-slot="scroll-area-viewport"
              className={cn(
                "size-full min-w-0 overflow-auto rounded-[inherit]",
                scrollFadeClassName,
                resolvedOverscrollClassName,
                viewportClassName
              )}
              tabIndex={0}
            >
              {children}
            </div>

          </div>
        </ScrollAreaContext.Provider>
      );
    }

    return (
      <ScrollAreaContext.Provider value={contextValue}>
        <ScrollAreaPrimitive.Root
          ref={ref}
          data-slot="scroll-area"
          scrollHideDelay={scrollHideDelay}
          className={cn("relative overflow-hidden", className)}
          {...props}
        >
          <ScrollAreaPrimitive.Viewport
            ref={viewportRef}
            data-slot="scroll-area-viewport"
            className={cn(
              "size-full min-w-0 rounded-[inherit]",
              scrollFadeClassName,
              resolvedOverscrollClassName,
              viewportClassName
            )}
          >
            {children}
          </ScrollAreaPrimitive.Viewport>
          {scrollbar !== "none" &&
            (scrollbar === "vertical" || scrollbar === "both") && <ScrollBar />}
          {scrollbar !== "none" &&
            (scrollbar === "horizontal" || scrollbar === "both") && (
              <ScrollBar orientation="horizontal" />
            )}
          <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
      </ScrollAreaContext.Provider>
    );
  }
);

ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => {
  const isTouch = React.useContext(ScrollAreaContext)?.isTouch ?? false;

  if (isTouch) return null;

  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      ref={ref}
      orientation={orientation}
      data-slot="scroll-area-scrollbar"
      className={cn(
        "hover:bg-muted dark:hover:bg-muted/50 data-[state=visible]:fade-in-0 data-[state=hidden]:fade-out-0 data-[state=visible]:animate-in data-[state=hidden]:animate-out flex touch-none p-px transition-[colors] duration-150 select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent px-1 pr-1.25",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className={cn(
          "bg-border relative flex-1 origin-center rounded-full transition-[scale]",
          orientation === "vertical" && "my-1 active:scale-y-95",
          orientation === "horizontal" && "active:scale-x-98"
        )}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
});

ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

function useScrollAreaViewportRef() {
  return React.useContext(ScrollAreaContext)?.viewportRef ?? null;
}

export { ScrollArea, ScrollBar, useScrollAreaViewportRef };
