// src/features/landing/ui/components/WaitlistSection.tsx
"use client";

import { useWaitlistUsers } from "../../hooks/useWaitlistUsers";
import { WaitlistDrawer } from "../../ui/components/WaitlistDrawer";
import { WaitlistUsers } from "../../ui/components/WaitlistUsers";
import { cn } from "@/shared/lib/utils/utils";

interface WaitlistSectionProps {
  className?: string;
}

export function WaitlistSection({ className }: WaitlistSectionProps) {
  const { totalCount } = useWaitlistUsers();
  return (
    <section
      aria-labelledby="waitlist-heading"
      className={cn(
        "ease-[cubic-bezier(0.25, 1, 0.5, 1)] px-4 py-6 duration-300 md:px-28 md:py-52",
        className
      )}
    >
      <h2 id="waitlist-heading" className="text-3xl font-medium">
        Join over{" "}
        {totalCount !== undefined ? (
          totalCount
        ) : (
          <span className="inline-block animate-spin">⟳</span>
        )}{" "}
        people already on the wait-list!
      </h2>
      <WaitlistDrawer />
      <WaitlistUsers className="mt-6 md:mt-12" />
    </section>
  );
}
