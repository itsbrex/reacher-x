// components/LinkWrapper.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface LinkWrapperProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  excludeSelectors?: string[];
  stopPropagation?: boolean; // New prop to stop event propagation
  isExternal?: boolean; // New prop to indicate external URL
}

export const LinkWrapper: React.FC<LinkWrapperProps> = ({
  href,
  children,
  className,
  excludeSelectors = ["button", "a", "video", "[role=button]", "media-chrome"],
  stopPropagation = false,
  isExternal = false,
}) => {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const shouldExclude = excludeSelectors.some(
      (selector) => target.closest(selector) !== null
    );

    if (shouldExclude) {
      return; // Do nothing if the click is on an excluded element
    }

    if (stopPropagation) {
      e.stopPropagation(); // Stop event from bubbling up
    }

    if (!isExternal) {
      router.push(href); // Internal navigation
    }
    // For external URLs, navigation is handled by the <a> tag via Link
  };

  // If it's an external link, wrap children in a Link component
  if (isExternal) {
    return (
      <div className={className} onClick={handleClick}>
        <Link href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </Link>
      </div>
    );
  }

  // For internal links, use the div with click handler
  return (
    <div className={className} onClick={handleClick}>
      {children}
    </div>
  );
};
