"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import Marquee from "react-fast-marquee";

import { cn } from "@/shared/lib/utils/utils";
import { WaitlistUserCard } from "./WaitlistUserCard";

interface WaitlistUser {
  avatarUrl: string;
  displayName: string;
  username: string;
  pro: boolean;
}

export interface WaitlistUsersMarqueeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  users: WaitlistUser[];
  asChild?: boolean;
}

export const WaitlistUsersMarquee = React.forwardRef<
  HTMLDivElement,
  WaitlistUsersMarqueeProps
>((props, ref) => {
  const { className, asChild, users, ...rest } = props;
  const Comp = asChild ? Slot : Marquee;

  return (
    <Comp
      gradient={false}
      speed={100}
      pauseOnHover={true}
      className={cn(className)}
      ref={ref}
      {...rest}
    >
      {users.map((user, index) => (
        <WaitlistUserCard key={index} className="mr-12" {...user} />
      ))}
    </Comp>
  );
});

WaitlistUsersMarquee.displayName = "WaitlistUsersMarquee";
