"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";

export type PageScrollAreaProps = React.ComponentPropsWithoutRef<"div">;

/**
 * Full-width vertical scroll owner for a web-app page or panel.
 *
 * Keep constrained content inside this element so the scrollbar stays on the
 * outer page edge instead of sitting next to a narrow content column.
 */
export const PageScrollArea = React.forwardRef<
  HTMLDivElement,
  PageScrollAreaProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="page-scroll-area"
    className={cn(
      "scroll-fade min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain",
      className
    )}
    {...props}
  />
));

PageScrollArea.displayName = "PageScrollArea";
