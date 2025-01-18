"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

import { Button } from "@/shared/ui/components/Button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/shared/ui/components/Drawer";

// Tailwind’s `cn` utility if you have one (shadcn’s recommended):
import { cn } from "@/lib/utils";

export function Header() {
  // For controlling the Drawer in mobile
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // For theme switching
  const { setTheme } = useTheme();

  // A small “ModeToggle” inline
  const ModeToggle = () => {
    return (
      <Button
        variant="outline"
        size="icon"
        // We could also do a dropdown if desired, but here let's do a simple toggle for demonstration
        onClick={() => {
          // Example toggle: if dark, switch to light. Otherwise, switch to dark.
          setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
        }}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
    );
  };

  return (
    <header
      className={cn(
        // For small screens: px-4 py-2
        // For md+ screens: px-[112px] py-[24px]
        "flex items-center justify-between",
        "px-4 py-2",
        "md:px-[112px] md:py-[24px]"
      )}
    >
      {/* Logo => link to home */}
      <Link href="/" className="text-xl font-bold" aria-label="ReacherX Home">
        🆁 ReacherX
      </Link>

      {/* Large-screen nav: 3 link buttons + theme toggle */}
      <nav className="hidden items-center gap-4 md:flex">
        <Button variant="link">Vision</Button>
        <Button variant="link">Threads</Button>
        <Button
          variant="link"
          onClick={() => {
            window.location.href = "mailto:support@reacherx.com";
          }}
        >
          Contact
        </Button>

        {/* Theme switch icon button */}
        <ModeToggle />
      </nav>

      {/* Small-screen nav: theme toggle + menu button */}
      <div className="flex items-center gap-2 md:hidden">
        <ModeToggle />
        <Button variant="ghost" onClick={() => setDrawerOpen(true)}>
          Menu
        </Button>
      </div>

      {/* Drawer for mobile menu */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Menu</DrawerTitle>
            <DrawerClose />
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Close
            </Button>
          </DrawerHeader>

          {/* Typically you'd put content in some container */}
          <div className="flex flex-col gap-4 p-4">
            <Button variant="link">Vision</Button>
            <Button variant="link">Threads</Button>
            <Button
              variant="link"
              onClick={() => {
                window.location.href = "mailto:support@reacherx.com";
              }}
            >
              Contact
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </header>
  );
}
