"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/components/Button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
} from "@/shared/ui/components/Drawer";
import { LightModeIcon, DarkModeIcon } from "@/shared/ui/components/icons";

/* ----------------------------------------------------------------------------
 * Mode Toggle
 * ----------------------------------------------------------------------------
 * A simple single-click dark/light toggle. If you prefer multiple options
 * (light, dark, system), you can replace this with a shadcn/ui dropdown.
 */
function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const handleToggle = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <Button variant="ghost" size="icon" onClick={handleToggle}>
      {isDark ? <LightModeIcon /> : <DarkModeIcon />}
    </Button>
  );
}

/* ----------------------------------------------------------------------------
 * Header variants (CVA)
 * ----------------------------------------------------------------------------
 * Encapsulate the root styles for <header>. You can add variants for size,
 * color-scheme, etc. if desired. Here we simply do the responsive spacing.
 */
const headerVariants = cva(
  // Base classes
  "flex items-center justify-between ease-[cubic-bezier(0.25, 1, 0.5, 1)] duration-300",
  {
    variants: {
      // Example variant: size
      size: {
        default: "px-4 py-2 md:px-28 md:py-6",
        // Could add e.g. sm, lg, etc.
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

// Optional cva for sub-elements if you want them standardized as well:
const navVariants = cva("hidden items-center gap-4 md:flex");
const brandLinkVariants = cva("text-base font-medium font-mono");
const rightSideVariants = cva("flex items-center gap-4");
const drawerMenuVariants = cva("flex flex-col items-start pb-4");

/* ----------------------------------------------------------------------------
 * Header Props
 * ----------------------------------------------------------------------------
 */
export interface HeaderProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof headerVariants> {
  /** If true, wraps the content in a Radix <Slot> instead of <header> */
  asChild?: boolean;
}

/* ----------------------------------------------------------------------------
 * Header Component
 * ----------------------------------------------------------------------------
 */
export const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ className, size, asChild = false, ...props }, ref) => {
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

    // Allow overriding the rendered element (similar to Button)
    const Comp = asChild ? Slot : "header";

    return (
      <Comp
        className={cn(headerVariants({ size }), className)}
        ref={ref}
        {...props}
      >
        {/* Brand link / title */}
        <Link
          href="/"
          aria-label="ReacherX Home"
          className={cn(brandLinkVariants())}
        >
          🆁 ReacherX
        </Link>

        {/* Right side: nav links (desktop) + theme toggle + mobile menu button */}
        <div className={cn(rightSideVariants())}>
          {/* Desktop nav (3 link buttons), hidden on mobile */}
          <nav className={cn(navVariants())}>
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
          </nav>

          {/* Single theme toggle button (always visible) */}
          <ModeToggle />

          {/* "Menu" button (mobile only) */}
          <Button
            variant="ghost"
            className="md:hidden"
            onClick={() => setIsDrawerOpen(true)}
          >
            Menu
          </Button>
        </div>

        {/* Drawer for mobile menu */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent>
            <DrawerHeader className="flex items-center justify-between p-4">
              <DrawerTitle>Menu.</DrawerTitle>
              <Button variant="ghost" onClick={() => setIsDrawerOpen(false)}>
                Close
              </Button>
            </DrawerHeader>

            <div className={cn(drawerMenuVariants())}>
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

            <DrawerFooter>
              <small>Follow on</small>
              <div className="flex items-center gap-4">
                <Button variant={"ghost"} size={"icon"}></Button>
                <Button variant={"ghost"} size={"icon"}></Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </Comp>
    );
  }
);

Header.displayName = "Header";
