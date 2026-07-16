import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

const inlineCodeVariants = cva(
  "border-border inline-flex items-center rounded border font-mono !leading-none",
  {
    variants: {
      variant: {
        default: "text-foreground px-1.5 py-0.5 text-[13px] font-medium",
        mark: "text-foreground size-5 justify-center p-0 text-[13px] font-medium align-middle",
        markdown:
          "bg-transparent px-1.5 py-0.5 text-sm font-normal text-inherit before:content-none after:content-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface InlineCodeProps
  extends
    React.ComponentProps<"code">,
    VariantProps<typeof inlineCodeVariants> {}

export function InlineCode({
  className,
  variant,
  ...props
}: InlineCodeProps) {
  return (
    <code className={cn(inlineCodeVariants({ variant }), className)} {...props} />
  );
}

export { inlineCodeVariants };
