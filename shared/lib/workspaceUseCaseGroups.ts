import type { WorkspaceUseCaseKey } from "./workspaceUseCases";

export const DEFAULT_WORKSPACE_USE_CASE_GROUP_FILTER = "all";

export const WORKSPACE_USE_CASE_GROUPS = [
  {
    key: "business_growth",
    categoryLabel: "For business growth",
    items: [
      {
        key: "customer_prospecting",
        title: "Leads, Customers & Users",
        description:
          "Find people and companies who are likely to need what you offer and are ready to buy.",
      },
      {
        key: "partnership_outreach",
        title: "Partnerships",
        description:
          "Find companies or individuals you could collaborate with to grow each other's business.",
      },
      {
        key: "investor_outreach",
        title: "Investors",
        description:
          "Find investors whose focus areas and recent activity suggest they'd be interested in your opportunity.",
      },
    ],
  },
  {
    key: "hiring_talent",
    categoryLabel: "For hiring & talent",
    items: [
      {
        key: "recruiting",
        title: "Candidates",
        description:
          "Find and reach out to candidates who match your open role, even if they're not actively looking.",
      },
    ],
  },
  {
    key: "audience_content",
    categoryLabel: "For audience & content",
    items: [
      {
        key: "community_growth",
        title: "Community members",
        description:
          "Find people who share an interest in your niche and are likely to engage with your community.",
      },
      {
        key: "creator_outreach",
        title: "Creators",
        description:
          "Find creators whose audience, tone, and content style align with your brand or campaign.",
      },
      {
        key: "podcast_speaker_sourcing",
        title: "Podcast guests",
        description:
          "Find people with the right expertise and story who would make a great guest on your show.",
      },
    ],
  },
  {
    key: "research",
    categoryLabel: "For research",
    items: [
      {
        key: "user_research_recruitment",
        title: "Research participants",
        description:
          "Find people you can interview or survey to get real feedback on your product or market.",
      },
    ],
  },
] as const satisfies readonly {
  key: string;
  categoryLabel: string;
  items: readonly {
    key: WorkspaceUseCaseKey;
    title: string;
    description: string;
  }[];
}[];

export type WorkspaceUseCaseGroup = (typeof WORKSPACE_USE_CASE_GROUPS)[number];
export type WorkspaceUseCaseGroupKey = WorkspaceUseCaseGroup["key"];
export type WorkspaceUseCaseGroupFilterValue =
  | typeof DEFAULT_WORKSPACE_USE_CASE_GROUP_FILTER
  | WorkspaceUseCaseGroupKey;

export function isWorkspaceUseCaseGroupKey(
  value: unknown
): value is WorkspaceUseCaseGroupKey {
  return WORKSPACE_USE_CASE_GROUPS.some((group) => group.key === value);
}

export function isWorkspaceUseCaseGroupFilterValue(
  value: unknown
): value is WorkspaceUseCaseGroupFilterValue {
  return (
    value === DEFAULT_WORKSPACE_USE_CASE_GROUP_FILTER ||
    isWorkspaceUseCaseGroupKey(value)
  );
}

export function getWorkspaceUseCaseGroupForUseCaseKey(
  useCaseKey: WorkspaceUseCaseKey
): WorkspaceUseCaseGroup | null {
  for (const group of WORKSPACE_USE_CASE_GROUPS) {
    if (group.items.some((item) => item.key === useCaseKey)) {
      return group;
    }
  }

  return null;
}
