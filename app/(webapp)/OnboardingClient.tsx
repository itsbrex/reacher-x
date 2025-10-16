"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Tour,
  TourContent,
  TourFooter,
  TourOverlay,
  TourStep,
} from "@/shared/ui/components/tour";
import { getSearchSteps } from "@/features/onboarding/steps";
import { useIsMobile } from "@/shared/ui/hooks/useMobile";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type TourState = { status: "paused" | "done"; resumeIndex: number };

const STORAGE_KEY = "rx.tour.v1";

export default function OnboardingClient() {
  const pathname = usePathname();
  const params = useSearchParams();
  const { isAuthenticated } = useConvexAuth();
  const setTourStateMutation = useMutation(api.users.setTourState);

  const shouldStart = useMemo(() => {
    if (pathname !== "/search") return false;
    const flag = params.get("tour");
    if (flag === "starter") return true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return true; // no state yet
      const st = JSON.parse(raw) as TourState;
      return st.status !== "done";
    } catch {
      return true;
    }
  }, [pathname, params]);

  const [isOpen, setOpen] = useState(false);
  const [resumeIndex, setResumeIndex] = useState(0);
  const [awaitResults, setAwaitResults] = useState(false);

  // Steps definition (mobile-aware for steps 6 & 7)
  const isMobile = useIsMobile();
  const steps = useMemo(() => getSearchSteps(isMobile), [isMobile]);

  // Initialize from storage
  useEffect(() => {
    if (!shouldStart) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const st = JSON.parse(raw) as TourState;
        if (st.status === "done") return;
        setResumeIndex(st.resumeIndex || 0);
      } else {
        setResumeIndex(0);
      }
    } catch {
      setResumeIndex(0);
    }
    setOpen(true);
  }, [shouldStart]);

  // After first step, pause until results are present
  useEffect(() => {
    if (!isOpen) return;
    if (resumeIndex <= 0) return;
    // We resume from index > 0 only when results exist (gate selector present)
    const gateSelector = "#rx-tour-reply";
    const el = document.querySelector(gateSelector);
    if (el) {
      setAwaitResults(false);
      return;
    }
    setAwaitResults(true);
    const obs = new MutationObserver(() => {
      const found = document.querySelector(gateSelector);
      if (found) {
        setAwaitResults(false);
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [isOpen, resumeIndex]);

  // When results become available after pausing, re-open the tour automatically
  useEffect(() => {
    if (!shouldStart) return;
    if (resumeIndex > 0 && !awaitResults) {
      setOpen(true);
    }
  }, [awaitResults, resumeIndex, shouldStart]);

  // Persist state changes
  const persist = (state: TourState) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
    if (isAuthenticated) {
      try {
        void setTourStateMutation({ tour: "v1", state });
      } catch {}
    }
  };

  // Footer labels: follow spec (xs buttons, copy variants)
  const footerLabels = useMemo(
    () => ({ back: "Back", next: "Got it!", finish: "Finish!" }),
    []
  );

  // Close handler is only for intermediate pauses (post step 1). Final completion happens via onFinish.
  const handleClose = () => {
    // If we just finished Step 1 (showed only the first step), advance resumeIndex and pause until results
    if (resumeIndex === 0) {
      const nextIdx = 1;
      setResumeIndex(nextIdx);
      persist({ status: "paused", resumeIndex: nextIdx });
      setAwaitResults(true);
      return;
    }
    // If closing mid-flow (e.g., user taps overlay), keep paused state at current resumeIndex
    persist({ status: "paused", resumeIndex });
  };

  // Explicit finish handler (invoked from the TourFooter on last step)
  const handleFinish = () => {
    persist({ status: "done", resumeIndex });
    setOpen(false);
  };

  // Render nothing on other routes
  if (!shouldStart) return null;

  // While awaiting results after step 1, do not render the overlay/content
  const effectiveOpen = isOpen && !awaitResults;

  return (
    <Tour
      steps={steps}
      isOpen={effectiveOpen}
      onClose={handleClose}
      initialIndex={resumeIndex}
    >
      <TourOverlay />
      <TourContent>
        <TourStep />
        <TourFooter labels={footerLabels} onFinish={handleFinish} />
      </TourContent>
    </Tour>
  );
}
