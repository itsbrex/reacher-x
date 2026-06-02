"use client";

import Link from "next/link";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { cn } from "@/shared/lib/utils";
import { buttonVariants } from "@/shared/ui/components/Button";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import {
  ArrowOutwardIcon,
  ChangeHistoryIcon,
} from "@/shared/ui/components/icons";

interface LandingPrimaryCtaProps {
  authenticatedHref?: string;
  anonymousHref?: string;
  authenticatedLabel?: string;
  anonymousLabel?: string;
  className?: string;
  skeletonClassName?: string;
}

export function LandingPrimaryCta({
  authenticatedHref = "/",
  anonymousHref = "/login",
  authenticatedLabel = "Dashboard",
  anonymousLabel = "Start reaching",
  className,
  skeletonClassName,
}: LandingPrimaryCtaProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Skeleton className={cn("h-10 w-40", skeletonClassName)} />;
  }

  if (user) {
    return (
      <Link
        href={authenticatedHref}
        className={cn(buttonVariants({ variant: "default" }), "rounded-full", className)}
      >
        {authenticatedLabel}
        <ArrowOutwardIcon className="size-4 fill-current" />
      </Link>
    );
  }

  return (
    <Link
      href={anonymousHref}
      className={cn(buttonVariants({ variant: "default" }), "rounded-full", className)}
    >
      <ChangeHistoryIcon className="size-4 fill-current" />
      {anonymousLabel}
    </Link>
  );
}
