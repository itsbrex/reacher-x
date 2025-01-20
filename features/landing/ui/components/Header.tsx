"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/components/Button";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
} from "@/shared/ui/components/Drawer";
import {
  LightModeIcon,
  DarkModeIcon,
  XIcon,
  DiscordIcon,
  RedditIcon,
  ThreadsIcon,
} from "@/shared/ui/components/icons";

/* ----------------------------------------------------------------------------
 * Mode Toggle
 * ----------------------------------------------------------------------------
 * A simple single-click dark/light toggle. If you prefer multiple options
 * (light, dark, system), you can replace this with a shadcn/ui dropdown.
 */
function ThemeToggle() {
  const { theme, setTheme, systemTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Handle hydration mismatch by mounting after first render
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = React.useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <Skeleton className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleToggle}>
      {resolvedTheme === "dark" ? (
        <LightModeIcon className="fill-current" />
      ) : (
        <DarkModeIcon className="fill-current" />
      )}
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
const rightSideVariants = cva("flex items-center gap-0 md:gap-4");
const drawerMenuVariants = cva("flex flex-col items-start");

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
          <ThemeToggle />

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
              <small className="text-sm font-medium text-neutral-500">
                Follow on
              </small>
              <div className="flex items-center">
                <Button
                  variant={"ghost"}
                  size={"icon"}
                  className="[&_svg]:size-8"
                >
                  <XIcon className="fill-current" />
                </Button>
                <Button
                  variant={"ghost"}
                  size={"icon"}
                  className="[&_svg]:size-8"
                >
                  <DiscordIcon className="fill-current" />
                </Button>
                <Button
                  variant={"ghost"}
                  size={"icon"}
                  className="[&_svg]:size-8"
                >
                  <ThreadsIcon className="fill-current" />
                </Button>
                <Button
                  variant={"ghost"}
                  size={"icon"}
                  className="[&_svg]:size-8"
                >
                  <RedditIcon className="fill-current" />
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </Comp>
    );
  }
);

Header.displayName = "Header";
