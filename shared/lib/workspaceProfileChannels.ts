export const WORKSPACE_PROFILE_CHANNELS = ["X/Twitter", "LinkedIn"] as const;

export type WorkspaceProfileChannel =
  (typeof WORKSPACE_PROFILE_CHANNELS)[number];

export function getWorkspaceProfileChannel(
  value: string
): WorkspaceProfileChannel | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "x" || normalized.includes("twitter")) {
    return "X/Twitter";
  }
  if (normalized.includes("linkedin")) {
    return "LinkedIn";
  }
  return null;
}

export function canonicalizeWorkspaceProfileChannels(
  values: string[]
): WorkspaceProfileChannel[] {
  const selected = new Set(
    values.flatMap((value) => {
      const channel = getWorkspaceProfileChannel(value);
      return channel ? [channel] : [];
    })
  );
  return WORKSPACE_PROFILE_CHANNELS.filter((channel) => selected.has(channel));
}

export function isSupportedWorkspaceProfileChannel(value: string): boolean {
  return getWorkspaceProfileChannel(value) !== null;
}
