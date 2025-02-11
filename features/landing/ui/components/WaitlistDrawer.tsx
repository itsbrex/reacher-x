"use client";

import * as React from "react";
import { Button } from "@/shared/ui/components/Button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerClose,
} from "@/shared/ui/components/Drawer";
import { WaitlistForm } from "@/features/landing/ui/components/WaitlistForm";
import { AvatarStack, WaitlistUser } from "./AvatarStack";

interface WaitlistDrawerProps {
  waitlistUsers: WaitlistUser[];
}

export function WaitlistDrawer({ waitlistUsers }: WaitlistDrawerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <Button className="mt-4" onClick={() => setIsOpen(true)}>
        Join wait-list
      </Button>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent>
          <aside aria-label="Waitlist Registration Form">
            <header>
              <DrawerHeader className="flex items-center justify-end p-4">
                <DrawerClose asChild>
                  <Button variant="ghost" aria-label="Close waitlist form">
                    Close
                  </Button>
                </DrawerClose>
              </DrawerHeader>
            </header>

            <main className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] grid grid-cols-1 gap-6 px-4 pb-4 duration-300 md:grid-cols-2 md:gap-12 md:px-28 md:pb-12">
              <section>
                <h2 className="text-3xl font-medium">
                  Join over {waitlistUsers.length} people already on the
                  wait-list!
                </h2>
                <div className="mt-4">
                  <AvatarStack users={waitlistUsers} />
                </div>
              </section>
              <WaitlistForm />
            </main>
          </aside>
        </DrawerContent>
      </Drawer>
    </>
  );
}
