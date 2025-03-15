"use client";

import { useState, useEffect } from "react";
import { useWaitlistUsers } from "@/features/landing/hooks/useWaitlistUsers";
import { WaitlistUsersMarquee } from "./WaitlistUsersMarquee";
import { AvatarStack } from "./AvatarStack";
import { AvatarStackSkeleton } from "./AvatarStackSkeleton";
import { WaitlistUsersMarqueeSkeleton } from "./WaitlistUsersMarqueeSkeleton";

interface WaitlistUsersProps {
  className?: string;
}

export function WaitlistUsers({ className }: WaitlistUsersProps) {
  const { profiles, loading, totalCount } = useWaitlistUsers();
  // Initialize state without accessing window
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Update state based on window size on client side
  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    // Set initial value on mount
    handleResize();
    // Add resize event listener
    window.addEventListener("resize", handleResize);
    // Cleanup listener on unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Render skeleton during loading
  if (loading) {
    return isSmallScreen ? (
      <AvatarStackSkeleton className={className} />
    ) : (
      <WaitlistUsersMarqueeSkeleton className={className} />
    );
  }

  // Render actual content when loaded
  return isSmallScreen ? (
    <AvatarStack
      users={profiles}
      className={className}
      totalCount={totalCount}
    />
  ) : (
    <WaitlistUsersMarquee users={profiles} className={className} />
  );
}
