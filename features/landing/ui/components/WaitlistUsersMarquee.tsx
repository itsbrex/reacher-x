"use client";

import React from "react";
import Marquee from "react-fast-marquee";
import { WaitlistUserCard } from "./WaitlistUserCard";

interface WaitlistUser {
  avatarUrl: string;
  displayName: string;
  username: string;
  pro: boolean;
}

interface WaitlistMarqueeProps {
  users: WaitlistUser[];
}

export function WaitlistMarquee({ users }: WaitlistMarqueeProps) {
  return (
    <Marquee gradient={false} speed={100} pauseOnHover={true} className="mx-12">
      {users.map((user, index) => (
        <WaitlistUserCard key={index} {...user} />
      ))}
    </Marquee>
  );
}
