// features/landing/ui/components/RecentThreads.tsx
import { ThreadCard } from "@/features/threads/ui/components/ThreadCard";
import { Thread } from "@/features/threads/types";
import { cn } from "@/shared/lib/utils";

interface RecentThreadsProps {
  threads: Thread[]; // Changed to required prop
  bordered?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Removed async and direct data fetching
export function RecentThreads({
  threads,
  bordered = true,
  size = "md",
  className = "",
}: RecentThreadsProps) {
  if (threads.length === 0) {
    return (
      <p className="text-muted-foreground mt-4 px-4 md:px-0">
        No recent threads available.
      </p>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-6", className)}>
      {threads.map((thread) => {
        const firstTweet = thread.tweets[0];
        return (
          <ThreadCard
            key={thread.threadId}
            className="[&_[data-orientation=vertical]]:hidden"
            characterLimit={168}
            staticTweet={firstTweet}
            size={size}
            bordered={bordered}
            clickHref={`/threads/${thread.threadId}`}
          />
        );
      })}
    </div>
  );
}
