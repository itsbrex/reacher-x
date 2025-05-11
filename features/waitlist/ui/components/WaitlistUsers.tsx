"use client";

import { useWaitlistUsers } from "@/features/waitlist/hooks/useWaitlistUsers";
import { AvatarStack } from "../../../landing/ui/components/AvatarStack";
import { AvatarStackSkeleton } from "../../../landing/ui/components/AvatarStackSkeleton";

interface WaitlistUsersProps {
  className?: string;
}

export function WaitlistUsers({ className }: WaitlistUsersProps) {
  const { profiles, loading, totalCount } = useWaitlistUsers();

  if (loading) {
    return <AvatarStackSkeleton className={className} />;
  }

  return (
    <AvatarStack
      users={profiles}
      className={className}
      totalCount={totalCount}
    />
  );
}
