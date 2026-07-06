import * as React from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/ui/components/Avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/components/Tooltip";
import { cn } from "@/shared/lib/utils";

function MessageGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-group"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    />
  );
}

function Message({
  className,
  align = "start",
  ...props
}: React.ComponentProps<"div"> & { align?: "start" | "end" }) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn(
        "group/message relative flex w-full min-w-0 gap-2 text-sm data-[align=end]:flex-row-reverse",
        className
      )}
      {...props}
    />
  );
}

export type MessageAvatarProps = {
  src?: string;
  alt: string;
  fallback?: string;
  delayMs?: number;
  className?: string;
  avatarClassName?: string;
  slotClassName?: string;
};

function MessageAvatar({
  src,
  alt,
  fallback,
  delayMs,
  className,
  avatarClassName,
  slotClassName,
}: MessageAvatarProps) {
  return (
    <div
      data-slot="message-avatar"
      className={cn(
        "flex w-fit shrink-0 items-center justify-center self-end p-px group-has-data-[slot=message-footer]/message:-translate-y-8",
        slotClassName
      )}
    >
      <Avatar className={cn("size-6", avatarClassName)}>
        {src ? <AvatarImage src={src} alt={alt} /> : null}
        {fallback ? (
          <AvatarFallback delayMs={delayMs} className={className}>
            {fallback}
          </AvatarFallback>
        ) : null}
      </Avatar>
    </div>
  );
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-content"
      className={cn(
        "flex w-full min-w-0 flex-col gap-2.5 wrap-break-word group-data-[align=end]/message:*:data-slot:self-end",
        className
      )}
      {...props}
    />
  );
}

function MessageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-header"
      className={cn(
        "text-muted-foreground flex max-w-full min-w-0 items-center px-3 text-xs font-medium group-has-data-[variant=ghost]/message:px-0",
        className
      )}
      {...props}
    />
  );
}

function MessageFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-footer"
      className={cn(
        "text-muted-foreground flex max-w-full min-w-0 items-center px-3 text-xs font-medium group-has-data-[variant=ghost]/message:px-0 group-data-[align=end]/message:justify-end",
        className
      )}
      {...props}
    />
  );
}

function MessageActions({
  children,
  className,
  ...props
}: React.HTMLProps<HTMLDivElement>) {
  return (
    <MessageFooter className={cn("gap-2 px-0", className)} {...props}>
      {children}
    </MessageFooter>
  );
}

export type MessageActionProps = {
  className?: string;
  tooltip: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
} & React.ComponentProps<typeof Tooltip>;

function MessageAction({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}: MessageActionProps) {
  return (
    <TooltipProvider>
      <Tooltip {...props}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} className={className}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export {
  MessageGroup,
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
  MessageFooter,
  MessageActions,
  MessageAction,
};
