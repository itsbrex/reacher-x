// app/(landing)/threads/page.tsx
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { ThreadCard } from "@/features/threads/ui/components/ThreadCard";
import { Badge } from "@/shared/ui/components/Badge";
import { Separator } from "@/shared/ui/components/Separator";
import { Thread } from "@/features/threads/types";
// Use next/link directly in server component to avoid client boundary wrapping
import { UserProfileCard } from "@/features/landing/ui/components/UserProfileCard";
import { logger } from "@/shared/lib/logger";
import VideoPlayer from "@/features/landing/ui/components/VideoPlayer";
import { Button } from "@/shared/ui/components/Button";

export const metadata = {
  title: "Threads",
  description: "Browse recent threads to stay updated on ReacherX.",
  openGraph: {
    title: "🆁 | Threads",
    description: "Browse recent threads to stay updated on ReacherX.",
    images: ["/og-default.jpg"],
    url: "https://reacherx.com/home/threads",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "🆁 | Threads",
    description: "Browse recent threads to stay updated on ReacherX.",
    images: ["/og-default.jpg"],
  },
};

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

export default async function ThreadsPage() {
  let staticThreads: Thread[] = [];
  try {
    staticThreads = (await convex.query(
      api.socialdataMutations.getStaticThreads
    )) as Thread[];
  } catch (error) {
    logger.error("Error fetching threads:", error);
  }

  if (staticThreads.length === 0) {
    return (
      <p className="mt-4 px-4 text-muted-foreground md:px-0">
        No threads available.
      </p>
    );
  }

  // Safely get the first thread and user data with fallbacks
  const firstThread = staticThreads[0];
  const firstTweet = firstThread?.tweets?.[0];
  const user = firstTweet?.user;

  return (
    <div className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] mx-auto mt-4 w-full max-w-[1288px] duration-300 md:mt-12">
      <Link href="/home" className="ml-4 block w-fit md:ml-0">
        <h1 className="text-2xl font-medium md:text-3xl">
          <span className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] inline-block rotate-180 transform-gpu text-muted-foreground duration-300 hover:translate-x-1">
            ➞
          </span>{" "}
          Threads.
        </h1>
      </Link>
      <div className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] grid grid-cols-1 gap-6 duration-300 md:mt-12 md:grid-cols-[calc(66.47%-1.5rem)_calc(33.53%-1.5rem)] md:gap-12">
        <section className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] duration-300 @container">
          {staticThreads.length === 0 ? (
            <p className="mx-auto mt-4 px-4 text-muted-foreground md:px-0">
              No threads available yet.
            </p>
          ) : (
            staticThreads.map((thread) => (
              <ThreadCard
                key={thread.threadId}
                className="px-4 py-4 md:px-0 md:py-6"
                staticTweet={thread.tweets[0]}
                characterLimit={166}
                size="lg"
                bordered={true}
                showThread={false}
                clickHref={`/home/threads/${thread.threadId}`}
              />
            ))
          )}
        </section>

        <aside className="space-y-6">
          <section className="px-4 md:px-0">
            <h3 className="text-2xl font-medium">Author.</h3>
            <UserProfileCard
              className="mt-4"
              profileImageUrlHttps={user?.profile_image_url_https}
              name={user?.name}
              screenName={user?.screen_name}
              verified={user?.verified}
              description={user?.description}
              followersCount={user?.followers_count}
              friendsCount={user?.friends_count}
              url={user?.url}
            />
          </section>
          <Separator orientation="horizontal" />
          <section
            id="hero"
            aria-labelledby="hero-heading"
            className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] grid grid-cols-1 gap-y-4 px-4 pb-8 duration-300 md:px-0"
          >
            <div>
              <Badge variant="outline">v3.0 beta</Badge>
              <hgroup className="mt-4 space-y-2">
                <h2 id="hero-heading" className="text-3xl font-medium">
                  The search engine—to find customers on X/Twitter.
                </h2>
                <p className="text-base font-medium text-muted-foreground">
                  ReacherX finds people who need your{" "}
                  <span className="text-foreground">next big thing</span> right
                  now. This is{" "}
                  <span className="text-foreground">faster and cheaper</span>{" "}
                  than ads to reach your audience.
                </p>
              </hgroup>
              <Button className="mt-4">Get started for free!</Button>
            </div>
            <figure className="order-last col-span-12 md:order-none portrait:md:col-span-12 landscape:md:col-span-5">
              <VideoPlayer
                mp4Url="https://nmx18xidmv.ufs.sh/f/uF4FhwZJse4NaVuAA63rRHc8WV3PvTh1GiXQdbIY06BofFej"
                ariaLabel="ReacherX video"
                className="aspect-[1/1] h-full w-full rounded-none"
              />
            </figure>
          </section>
        </aside>
      </div>
    </div>
  );
}
