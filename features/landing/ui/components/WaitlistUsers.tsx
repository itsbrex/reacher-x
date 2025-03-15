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
  // Set initial state based on window.innerWidth
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);

  // Handle window resize to keep isSmallScreen updated
  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
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
