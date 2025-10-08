import { Badge } from "@/shared/ui/components/Badge";
//import { RecentThreads } from "@/features/threads/ui/components/RecentThreads";
// import Link from "next/link";
// removed unused imports related to waitlist sections for lean markup
// import { getRecentThreads } from "@/features/threads/lib/getRecentThreads";
// import { PictureCarousel } from "@/features/landing/ui/components/PictureCarousel";
// import { WaitlistFormWrapper } from "@/features/waitlist/ui/components/WaitlistFormWrapper";
// import { WaitlistUsers } from "@/features/waitlist/ui/components/WaitlistUsers";
import { Button } from "@/shared/ui/components/Button";
import VideoPlayer from "@/features/landing/ui/components/VideoPlayer";

export const metadata = {
  title: "ReacherX",
  description:
    "The search engine—to find customers. Join the wait-list for early access and updates!",
  openGraph: {
    title: "🆁 ReacherX",
    description:
      "The search engine—to find customers. Join the wait-list for early access and updates!",
    images: ["/og-default.jpg"],
    url: "https://reacherx.com",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "🆁 ReacherX",
    description:
      "The search engine—to find customers. Join the wait-list for early access and updates!",
    images: ["/og-default.jpg"],
  },
};

export default async function Home() {
  // const recentThreads = await getRecentThreads(5);

  return (
    <div className="mx-auto w-full max-w-[1288px]">
      <section
        id="hero"
        aria-labelledby="hero-heading"
        className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] grid grid-cols-1 gap-y-4 px-4 pb-8 duration-300 @container md:grid-cols-8 md:gap-x-12 md:pb-28 portrait:md:grid-cols-1"
      >
        <div className="col-span-12 self-end lg:mb-12 portrait:md:col-span-12 landscape:md:col-span-3">
          <Badge variant="outline">v3.0 beta</Badge>
          <hgroup className="mt-4 space-y-2">
            <h1 id="hero-heading" className="text-4xl font-medium md:text-5xl">
              The search engine—to find customers on X/Twitter.
            </h1>
            <p className="text-xl font-medium text-muted-foreground md:text-2xl">
              ReacherX finds people who need your{" "}
              <span className="text-foreground">next big thing</span> right now.
              This is{" "}
              <span className="text-foreground">faster and cheaper</span> than
              ads to reach your audience.
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
      <section
        aria-labelledby="who-is-it-for-heading"
        className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] grid grid-cols-1 gap-y-4 px-4 pb-8 duration-300 @container md:grid-cols-8 md:gap-x-12 md:pb-28 portrait:md:grid-cols-1"
      >
        <figure className="order-last col-span-12 md:order-none portrait:md:col-span-12 landscape:md:col-span-5">
          <VideoPlayer
            mp4Url="https://nmx18xidmv.ufs.sh/f/uF4FhwZJse4NaVuAA63rRHc8WV3PvTh1GiXQdbIY06BofFej"
            ariaLabel="ReacherX video"
            className="aspect-[1/1] h-full w-full rounded-none"
          />
        </figure>
        <div className="col-span-12 self-end lg:mb-12 portrait:md:col-span-12 landscape:md:col-span-3">
          <hgroup className="mt-4 space-y-2">
            <h2
              id="who-is-it-for-heading"
              className="text-2xl font-medium md:text-3xl"
            >
              Who is it for?
            </h2>
            <p className="text-xl font-medium text-muted-foreground md:text-2xl">
              People who want to{" "}
              <span className="text-foreground">make a difference</span> with
              their products or services. People who{" "}
              <span className="text-foreground">
                don&apos;t want to waste money
              </span>{" "}
              on ads.
            </p>
          </hgroup>
          <Button variant="outline" className="mt-4">
            Get started for free!
          </Button>
        </div>
      </section>
      <section
        aria-labelledby="keyword-suggestions-heading"
        className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] grid grid-cols-1 gap-y-4 px-4 pb-8 duration-300 @container md:grid-cols-8 md:gap-x-12 md:pb-28 portrait:md:grid-cols-1"
      >
        <div className="col-span-12 self-end lg:mb-12 portrait:md:col-span-12 landscape:md:col-span-3">
          <hgroup className="mt-4 space-y-2">
            <h2
              id="keyword-suggestions-heading"
              className="text-2xl font-medium md:text-3xl"
            >
              Keyword suggestions.
            </h2>
            <p className="text-xl font-medium text-muted-foreground md:text-2xl">
              Describe what you offer and who might need it today. Based on
              this, you get{" "}
              <span className="text-foreground">keyword suggestions</span> to
              find people.
            </p>
          </hgroup>
          <Button variant="outline" className="mt-4">
            Get started for free!
          </Button>
        </div>
        <figure className="order-last col-span-12 md:order-none portrait:md:col-span-12 landscape:md:col-span-5">
          <VideoPlayer
            mp4Url="https://nmx18xidmv.ufs.sh/f/uF4FhwZJse4NaVuAA63rRHc8WV3PvTh1GiXQdbIY06BofFej"
            ariaLabel="ReacherX video"
            className="aspect-[1/1] h-full w-full rounded-none"
          />
        </figure>
      </section>
      <section
        aria-labelledby="exact-phrase-match-heading"
        className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] grid grid-cols-1 gap-y-4 px-4 pb-8 duration-300 @container md:grid-cols-8 md:gap-x-12 md:pb-28 portrait:md:grid-cols-1"
      >
        <figure className="order-last col-span-12 md:order-none portrait:md:col-span-12 landscape:md:col-span-5">
          <VideoPlayer
            mp4Url="https://nmx18xidmv.ufs.sh/f/uF4FhwZJse4NaVuAA63rRHc8WV3PvTh1GiXQdbIY06BofFej"
            ariaLabel="ReacherX video"
            className="aspect-[1/1] h-full w-full rounded-none"
          />
        </figure>
        <div className="col-span-12 self-end lg:mb-12 portrait:md:col-span-12 landscape:md:col-span-3">
          <hgroup className="mt-4 space-y-2">
            <h2
              id="exact-phrase-match-heading"
              className="text-2xl font-medium md:text-3xl"
            >
              Search with Exact Phrase Match.
            </h2>
            <p className="text-xl font-medium text-muted-foreground md:text-2xl">
              Toggle{" "}
              <span className="text-foreground">Exact Phrase Match ON</span> for
              precise, targeted results. Toggle it{" "}
              <span className="text-foreground">OFF</span> for broader results
              and more opportunities.
            </p>
          </hgroup>
          <Button variant="outline" className="mt-4">
            Get started for free!
          </Button>
        </div>
      </section>
      <section
        aria-labelledby="reach-out-to-customers-heading"
        className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] grid grid-cols-1 gap-y-4 px-4 pb-8 duration-300 @container md:grid-cols-8 md:gap-x-12 md:pb-28 portrait:md:grid-cols-1"
      >
        <div className="col-span-12 self-end lg:mb-12 portrait:md:col-span-12 landscape:md:col-span-3">
          <hgroup className="mt-4 space-y-2">
            <h2
              id="reach-out-to-customers-heading"
              className="text-2xl font-medium md:text-3xl"
            >
              Reach out to customers.
            </h2>
            <p className="text-xl font-medium text-muted-foreground md:text-2xl">
              Reply{" "}
              <span className="text-foreground">directly with ReacherX</span> to
              reach people fast and offer solutions. Keep replying while earlier
              replies are sending
              <span className="text-foreground">—no need to wait</span>.
            </p>
          </hgroup>
          <Button variant="outline" className="mt-4">
            Get started for free!
          </Button>
        </div>
        <figure className="order-last col-span-12 md:order-none portrait:md:col-span-12 landscape:md:col-span-5">
          <VideoPlayer
            mp4Url="https://nmx18xidmv.ufs.sh/f/uF4FhwZJse4NaVuAA63rRHc8WV3PvTh1GiXQdbIY06BofFej"
            ariaLabel="ReacherX video"
            className="aspect-[1/1] h-full w-full rounded-none"
          />
        </figure>
      </section>
      <section
        aria-labelledby="manage-workspace-heading"
        className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] grid grid-cols-1 gap-y-4 px-4 pb-8 duration-300 @container md:grid-cols-8 md:gap-x-12 md:pb-28 portrait:md:grid-cols-1"
      >
        <figure className="order-last col-span-12 md:order-none portrait:md:col-span-12 landscape:md:col-span-5">
          <VideoPlayer
            mp4Url="https://nmx18xidmv.ufs.sh/f/uF4FhwZJse4NaVuAA63rRHc8WV3PvTh1GiXQdbIY06BofFej"
            ariaLabel="ReacherX video"
            className="aspect-[1/1] h-full w-full rounded-none"
          />
        </figure>
        <div className="col-span-12 self-end lg:mb-12 portrait:md:col-span-12 landscape:md:col-span-3">
          <hgroup className="mt-4 space-y-2">
            <h2
              id="manage-workspace-heading"
              className="text-2xl font-medium md:text-3xl"
            >
              Manage workspace.
            </h2>
            <p className="text-xl font-medium text-muted-foreground md:text-2xl">
              Organize your search for{" "}
              <span className="text-foreground">
                different products or services
              </span>{" "}
              you offer. You can have{" "}
              <span className="text-foreground">one workspace now</span> with
              more coming soon.
            </p>
          </hgroup>
          <Button variant="outline" className="mt-4">
            Get started for free!
          </Button>
        </div>
      </section>
      <section
        aria-labelledby="more-features-heading"
        className="ease-[cubic-bezier(0.25, 1, 0.5, 1)] grid grid-cols-1 gap-12 px-4 pb-8 duration-300 @container md:pb-28 lg:grid-cols-3 portrait:md:grid-cols-1 landscape:md:grid-cols-2 landscape:lg:grid-cols-3"
      >
        <h2 id="more-features-heading" className="sr-only">
          More features
        </h2>
        <div className="flex flex-col">
          <figure className="order-last mt-4 md:order-none md:mt-0">
            <VideoPlayer
              mp4Url="https://nmx18xidmv.ufs.sh/f/uF4FhwZJse4NaVuAA63rRHc8WV3PvTh1GiXQdbIY06BofFej"
              ariaLabel="ReacherX video"
              className="aspect-[1/1] h-full w-full rounded-none"
            />
          </figure>
          <div className="mt-0 md:mt-4">
            <hgroup className="space-y-2">
              <h2
                id="pin-best-keywords-heading"
                className="text-2xl font-medium md:text-3xl"
              >
                Pin best keywords.
              </h2>
              <p className="text-xl font-medium text-muted-foreground">
                Pin any keyword that finds the{" "}
                <span className="text-foreground">best results</span> for you.
                Reuse pinned keywords to discover more people who{" "}
                <span className="text-foreground">need what you have.</span>
              </p>
            </hgroup>
            <Button variant="outline" className="mt-4">
              Get started for free!
            </Button>
          </div>
        </div>
        <div className="flex flex-col">
          <figure className="order-last mt-4 md:order-none md:mt-0">
            <VideoPlayer
              mp4Url="https://nmx18xidmv.ufs.sh/f/uF4FhwZJse4NaVuAA63rRHc8WV3PvTh1GiXQdbIY06BofFej"
              ariaLabel="ReacherX video"
              className="aspect-[1/1] h-full w-full rounded-none"
            />
          </figure>
          <div className="mt-0 md:mt-4">
            <hgroup className="space-y-2">
              <h2
                id="filter-and-sort-results-heading"
                className="text-2xl font-medium md:text-3xl"
              >
                Filter and sort results.
              </h2>
              <p className="text-xl font-medium text-muted-foreground">
                Choose what to see:{" "}
                <span className="text-foreground">
                  Posts, Replies, or Quotes
                </span>{" "}
                with advance filters. Sort results{" "}
                <span className="text-foreground">different ways</span> to find
                people faster.
              </p>
            </hgroup>
            <Button variant="outline" className="mt-4">
              Get started for free!
            </Button>
          </div>
        </div>
        <div className="flex flex-col">
          <figure className="order-last mt-4 md:order-none md:mt-0">
            <VideoPlayer
              mp4Url="https://nmx18xidmv.ufs.sh/f/uF4FhwZJse4NaVuAA63rRHc8WV3PvTh1GiXQdbIY06BofFej"
              ariaLabel="ReacherX video"
              className="aspect-[1/1] h-full w-full rounded-none"
            />
          </figure>
          <div className="mt-0 md:mt-4">
            <hgroup className="space-y-2">
              <h2
                id="upvote-and-downvote-results-heading"
                className="text-2xl font-medium md:text-3xl"
              >
                Upvote and downvote results.
              </h2>
              <p className="text-xl font-medium text-muted-foreground">
                Thumbs up <span className="text-foreground">good results</span>{" "}
                to teach the system what works for you. Thumbs down{" "}
                <span className="text-foreground">bad ones</span> to get better
                suggestions.
              </p>
            </hgroup>
            <Button variant="outline" className="mt-4">
              Get started for free!
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
