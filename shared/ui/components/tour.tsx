"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  arrow as arrowMw,
  Placement,
} from "@floating-ui/react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/shared/lib/utils/utils";
import { Button } from "@/shared/ui/components/Button";

export type TourStepDef = {
  target: string; // CSS selector (e.g., #rx-tour-exact-toggle)
  step: React.ReactNode; // Content for the step
  placement?: Placement; // Preferred placement
};

type TourContextValue = {
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  index: number;
  setIndex: (i: number) => void;
  steps: TourStepDef[];
};

const TourCtx = React.createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = React.useContext(TourCtx);
  if (!ctx) throw new Error("useTour must be used within <Tour>");
  return ctx;
}

export function Tour({
  steps,
  children,
  isOpen: controlledOpen,
  onClose,
  initialIndex = 0,
}: {
  steps: TourStepDef[];
  children: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  initialIndex?: number;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(
    controlledOpen ?? false
  );
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? !!controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback(
    (v: boolean) => {
      if (!isControlled) setUncontrolledOpen(v);
      if (!v) onClose?.();
    },
    [isControlled, onClose]
  );

  const [index, setIndex] = useState<number>(initialIndex);
  const value = useMemo(
    () => ({ isOpen, setOpen, index, setIndex, steps }),
    [isOpen, setOpen, index, steps]
  );

  // Reset index if steps or initialIndex changes
  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, steps.length]);

  return <TourCtx.Provider value={value}>{children}</TourCtx.Provider>;
}

export function TourTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const Comp = asChild ? Slot : "button";
  const { setOpen } = useTour();
  return <Comp onClick={() => setOpen(true)}>{children}</Comp>;
}

export function TourOverlay({ className }: { className?: string }) {
  const { isOpen, setOpen } = useTour();
  if (!isOpen) return null;
  return (
    <div
      className={cn(
        // Use a darker overlay on light theme and a subtle light overlay on dark theme
        // to maintain contrast of the floating content and target highlight
        "fixed inset-0 z-[60] bg-black/50 dark:bg-white/10",
        className
      )}
      onClick={() => setOpen(false)}
      aria-hidden="true"
    />
  );
}

export function TourContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isOpen, steps, index } = useTour();
  const targetSelector = steps[index]?.target;
  const arrowRef = useRef<HTMLDivElement | null>(null);

  const [referenceEl, setReferenceEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!isOpen || !targetSelector) {
      setReferenceEl(null);
      return;
    }
    const resolve = () => {
      try {
        const el = document.querySelector<HTMLElement>(targetSelector);
        if (el) setReferenceEl(el);
      } catch {
        // ignore
      }
    };
    resolve();
    if (referenceEl) return;
    const obs = new MutationObserver(() => resolve());
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
    // We intentionally do not depend on referenceEl here to avoid re-subscribing
    // repeatedly while the observer is active.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetSelector]);

  const { refs, floatingStyles, middlewareData, placement } = useFloating({
    elements: { reference: referenceEl || undefined },
    placement: steps[index]?.placement || "bottom",
    // Use fixed strategy so positioning is anchored to the viewport
    // and unaffected by ancestor transforms/positioning.
    strategy: "fixed",
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 }),
      arrowMw({ element: arrowRef }),
    ],
    whileElementsMounted: referenceEl ? autoUpdate : undefined,
  });

  // Ensure the referenced element is visible enough to position against.
  useEffect(() => {
    if (!isOpen || !referenceEl) return;
    try {
      referenceEl.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "smooth",
      });
    } catch {}
  }, [isOpen, referenceEl]);

  if (!isOpen || !referenceEl) return null;

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      role="dialog"
      aria-modal="true"
      className={cn(
        "z-[61] max-w-[320px] rounded-md border bg-popover p-3 text-popover-foreground shadow-lg",
        "outline-none",
        className
      )}
    >
      {children}
      <TourArrow
        ref={arrowRef}
        placement={placement}
        middlewareData={middlewareData}
      />
    </div>
  );
}

export const TourStep = function TourStep() {
  const { steps, index } = useTour();
  return <div className="space-y-1 text-sm">{steps[index]?.step}</div>;
};

export function TourFooter({
  className,
  labels,
  onFinish,
}: {
  className?: string;
  labels?: Partial<{
    back: string;
    next: string;
    finish: string;
    gotIt: string;
  }>;
  onFinish?: () => void;
}) {
  const { steps, index, setIndex } = useTour();
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  const onBack = () => setIndex(Math.max(0, index - 1));
  const onNext = () => {
    if (isLast) {
      onFinish?.();
      return;
    }
    setIndex(index + 1);
  };

  const l = {
    back: labels?.back ?? "Back",
    next: labels?.next ?? "Got it!",
    finish: labels?.finish ?? "Finish!",
  };

  return (
    <div className={cn("mt-3 flex items-center justify-end gap-2", className)}>
      {!isFirst && (
        <Button size="xs" variant="outline" onClick={onBack}>
          {l.back}
        </Button>
      )}
      <Button size="xs" onClick={onNext}>
        {isLast ? l.finish : l.next}
      </Button>
    </div>
  );
}

type MiddlewareData = { arrow?: { x?: number; y?: number } };

export const TourArrow = React.forwardRef<
  HTMLDivElement,
  { placement?: Placement; middlewareData?: MiddlewareData; className?: string }
>(function TourArrow({ placement, middlewareData, className }, ref) {
  if (!middlewareData?.arrow) return null;
  const { x, y } = middlewareData.arrow;
  const staticSideMap: Record<"top" | "right" | "bottom" | "left", string> = {
    top: "bottom",
    right: "left",
    bottom: "top",
    left: "right",
  };
  const base = (placement?.split("-")[0] || "bottom") as
    | "top"
    | "right"
    | "bottom"
    | "left";
  const staticSide = staticSideMap[base];
  return (
    <div
      ref={ref}
      className={cn("absolute size-2 rotate-45 bg-popover", className)}
      style={
        {
          left: x != null ? `${x}px` : "",
          top: y != null ? `${y}px` : "",
          [staticSide]: "-4px",
        } as React.CSSProperties
      }
    />
  );
});
