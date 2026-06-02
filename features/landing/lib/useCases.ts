const PLACEHOLDER_VIDEO_URL =
  "https://nmx18xidmv.ufs.sh/f/uF4FhwZJse4Ne4o1rZgyRbrWdIGZK0sCkx5o6azDVPMBptAj";

export type UseCase = {
  slug: string;
  title: string;
  description: string;
  videoUrl: string;
  /** Deep link to a public thread showcasing this use case. */
  threadHref: string;
};

export const USE_CASES: UseCase[] = [
  {
    slug: "customers",
    title: "Customers",
    description: "Find and reach people who are likely to buy what you offer.",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    threadHref: "#",
  },
  {
    slug: "candidates",
    title: "Candidates",
    description: "Source and engage people who match your open roles.",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    threadHref: "#",
  },
  {
    slug: "investors",
    title: "Investors",
    description: "Reach investors whose thesis aligns with your raise.",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    threadHref: "#",
  },
  {
    slug: "partners",
    title: "Partners",
    description: "Connect with companies and operators in your space.",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    threadHref: "#",
  },
  {
    slug: "community-members",
    title: "Community Members",
    description: "Find early members who genuinely care about your topic.",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    threadHref: "#",
  },
  {
    slug: "creators",
    title: "Creators",
    description: "Reach influencers and creators who align with your brand.",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    threadHref: "#",
  },
  {
    slug: "research-participants",
    title: "Research Participants",
    description: "Recruit people who match your study criteria.",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    threadHref: "#",
  },
  {
    slug: "podcast-guests",
    title: "Podcast Guests",
    description: "Find guests with real expertise and something to say.",
    videoUrl: PLACEHOLDER_VIDEO_URL,
    threadHref: "#",
  },
];
