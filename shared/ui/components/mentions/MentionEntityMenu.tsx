"use client";

import * as React from "react";
import {
  CircleUserRoundIcon,
  ListTodo,
  MessageSquareText,
  Paperclip,
  Workflow,
} from "lucide-react";
import type { MentionEntitySearchResult } from "@/shared/lib/mentions/mentionEntities";
import { cn } from "@/shared/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/ui/components/Avatar";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { NewReleasesIcon } from "@/shared/ui/components/icons";

class MentionEntityMenuBoundary extends React.Component<
  {
    children: React.ReactNode;
    resetKey: string;
    fallback: React.ReactNode;
  },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(
      "[MentionEntityMenu] Failed to render mention results",
      error
    );
  }

  componentDidUpdate(
    prevProps: Readonly<{
      children: React.ReactNode;
      resetKey: string;
      fallback: React.ReactNode;
    }>
  ) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function getMentionEntityIcon(kind: MentionEntitySearchResult["kind"]) {
  switch (kind) {
    case "plan":
      return <Workflow className="size-4" aria-hidden="true" />;
    case "task":
      return <ListTodo className="size-4" aria-hidden="true" />;
    case "post":
      return <MessageSquareText className="size-4" aria-hidden="true" />;
    case "attachment":
      return <Paperclip className="size-4" aria-hidden="true" />;
    case "prospect":
    default:
      return <CircleUserRoundIcon className="size-4" aria-hidden="true" />;
  }
}

function getMentionEntityFallbackLabel(entity: MentionEntitySearchResult) {
  if (entity.kind === "prospect") {
    return entity.label?.charAt(0).toUpperCase() || "?";
  }

  return getMentionEntityIcon(entity.kind);
}

export function MentionEntityMenu({
  results,
  loading = false,
  selectedIndex = -1,
  onSelect,
  onHover,
  emptyLabel = "No matches found.",
  className,
  bodyStyle,
  searchSlot,
  listboxId,
  getOptionId,
}: {
  results: MentionEntitySearchResult[];
  loading?: boolean;
  selectedIndex?: number;
  onSelect: (item: MentionEntitySearchResult) => void;
  onHover?: (index: number) => void;
  emptyLabel?: string;
  className?: string;
  bodyStyle?: React.CSSProperties;
  searchSlot?: React.ReactNode;
  listboxId?: string;
  getOptionId?: (item: MentionEntitySearchResult, index: number) => string;
}) {
  const menuBody = (
    <div
      id={listboxId}
      role="listbox"
      className="scroll-fade-b max-h-72 overflow-auto p-1"
      style={bodyStyle}
    >
      {loading ? (
        Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`loading-${index}`}
            className="flex items-center gap-3 rounded-lg px-2 py-2"
          >
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))
      ) : results.length === 0 ? (
        <div className="text-muted-foreground px-2 py-2 text-sm">
          {emptyLabel}
        </div>
      ) : (
        results.map((item, index) => (
          <button
            key={item.id}
            id={getOptionId?.(item, index)}
            role="option"
            type="button"
            className={cn(
              "hover:bg-muted flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
              selectedIndex === index && "bg-muted"
            )}
            aria-selected={selectedIndex === index}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHover?.(index)}
            onClick={() => onSelect(item)}
          >
            <Avatar className="ring-border h-9 w-9 ring-1">
              {item.avatarUrl ? (
                <AvatarImage
                  src={item.avatarUrl}
                  alt={`Avatar for ${item.label}`}
                />
              ) : null}
              <AvatarFallback>
                {getMentionEntityFallbackLabel(item)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-foreground truncate text-sm font-medium">
                  {item.label}
                </span>
                {item.verified ? (
                  <NewReleasesIcon
                    className="text-primary size-3 fill-current"
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <div className="text-muted-foreground truncate text-xs">
                {item.secondaryLabel}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "bg-background max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border shadow-xl",
        className
      )}
    >
      {searchSlot ? <div className="border-b p-2">{searchSlot}</div> : null}
      <MentionEntityMenuBoundary
        resetKey={`${loading}:${results.map((item) => item.id).join("|")}`}
        fallback={
          <div className="text-muted-foreground px-2 py-2 text-sm">
            Mention results are temporarily unavailable.
          </div>
        }
      >
        {menuBody}
      </MentionEntityMenuBoundary>
    </div>
  );
}
