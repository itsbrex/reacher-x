// app/home/threads/[threadId]/page.tsx
import type { Metadata } from "next";
import { connection } from "next/server";
import { UserProfileCard } from "@/features/landing/ui/components/UserProfileCard";
import { Separator } from "@/shared/ui/components/Separator";

import { Badge } from "@/shared/ui/components/Badge";
import Link from "next/link";

import { buttonVariants } from "@/shared/ui/components/Button";
import { FigureVideo } from "@/features/landing/ui/components/FigureVideo";
import { ArrowOutwardIcon } from "@/shared/ui/components/icons";
import { PromoCounter } from "@/features/landing/ui/components/PromoCounter";
import { notFound } from "next/navigation";
import { ThreadCard } from "@/features/threads/ui/components/ThreadCard";
import { RecentThreads } from "@/features/threads/ui/components/RecentThreads";
import {
  getPublicThread,
  getPublicThreads,
} from "@/features/threads/lib/getPublicThreads";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ threadId: string }>;
}): Promise<Metadata> {
  const { threadId } = await params; // Await the params Promise
  const { thread } = await getPublicThread(threadId);

  if (!thread) {
    return {
      title: "Thread Not Found",
      description: "This thread could not be found.",
    };
  }

  const firstTweet = thread.tweets[0];
  const ogImage =
    firstTweet?.entities?.media?.[0]?.media_url_https || "/og-default.jpg";
  const title = `Thread by @${firstTweet?.user?.screen_name || "unknown"}`;
  const description = firstTweet?.full_text?.slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [ogImage],
      url: `https://reacherx.com/home/threads/${threadId}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ThreadDetailPage(props: {
  params: Promise<{ threadId: string }>;
}) {
  // Signal dynamic rendering - required for Convex fetch with cacheComponents
  await connection();

  const params = await props.params;
  const { threadId } = params;

  const [{ thread, threadNumber }, recentThreads] = await Promise.all([
    getPublicThread(threadId),
    getPublicThreads({
      excludeThreadId: threadId,
      limit: 4,
    }),
  ]);

  if (!thread) {
    notFound();
  }

  const tweets = thread.tweets;
  const user = tweets[0].user;

  return (
    <div className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] mx-auto mt-4 w-full max-w-[1288px] duration-300 md:mt-12 md:px-4">
      <Link
        href="/home/threads"
        className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] ml-4 block w-fit duration-300 md:ml-0"
      >
        <h1 className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] text-2xl font-medium duration-300 md:text-3xl">
          <span className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] text-muted-foreground inline-block rotate-180 transform-gpu duration-300 hover:translate-x-1">
            ➞
          </span>{" "}
          Thread{" "}
          <span className="text-muted-foreground font-mono font-normal">
            #{threadNumber !== null ? threadNumber : ""}
          </span>
        </h1>
      </Link>
      <div className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] grid grid-cols-1 gap-6 duration-300 md:mt-12 md:grid-cols-[calc(66.47%-1.5rem)_calc(33.53%-1.5rem)] md:gap-12 md:pb-56">
        <section className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] @container px-4 duration-300 md:px-0">
          {tweets.map((tweet, index) => (
            <ThreadCard
              className="pt-2"
              key={tweet.id_str}
              staticTweet={tweet}
              size="lg"
              showFullContent={true}
              showThread={index === tweets.length - 1}
            />
          ))}
        </section>
        <Separator orientation="horizontal" className="block md:hidden" />
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
            className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] grid grid-cols-1 gap-y-4 px-4 duration-300 md:px-0"
          >
            <div>
              <Badge>✧ Now supports LinkedIn</Badge>
              <hgroup className="mt-4 space-y-2">
                <h2 id="hero-heading" className="text-3xl font-medium">
                  AI search engine to find potential customers on the web.
                </h2>
                <p className="text-muted-foreground text-base font-medium">
                  Get access to people who need your{" "}
                  <span className="text-foreground">product/service</span> right
                  now. A{" "}
                  <span className="text-foreground">
                    better, faster, and cheaper
                  </span>{" "}
                  solution than ads to reach your audience.
                </p>
              </hgroup>
              <Link
                href="/"
                className={`${buttonVariants({ variant: "default" })} mt-4`}
              >
                Start finding customers
                <ArrowOutwardIcon className="fill-current" />
              </Link>
              <br />
              <small className="text-muted-foreground mt-2 block text-sm">
                <span className="text-foreground font-medium">1 year free</span>{" "}
                for first <PromoCounter className="inline" />
              </small>
            </div>
            <FigureVideo
              mp4Url="https://nmx18xidmv.ufs.sh/f/uF4FhwZJse4NgsGo9xphdWDIlwzXNZkSCAxQUf6RmpKqgTG2"
              ariaLabel="ReacherX video"
              figureClassName="order-last col-span-12 aspect-square md:order-0 portrait:md:col-span-12 landscape:md:col-span-5"
              className="aspect-square h-full w-full rounded-none"
              posterUrl="https://nmx18xidmv.ufs.sh/f/uF4FhwZJse4NLqiC8RfThnvNigGByTM95kYptFD4PjuRd82a"
              initialPreload="metadata"
            />
          </section>

          <Separator orientation="horizontal" />
          <section>
            <h3 className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] px-4 text-2xl font-medium duration-300 md:px-0">
              Recent threads.
            </h3>
            {recentThreads.length > 0 ? (
              <RecentThreads threads={recentThreads} />
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
