/**
 * Build a deterministic progress key for keyword generation
 * Format: kwgen|<workspaceId|local>|<normalizedDescription>
 */
export function makeKeywordGenProgressKey(
  workspaceId: string | null | undefined,
  userDescription: string | null | undefined
): string {
  const ws = workspaceId || "local";
  const desc = normalizeDescription(userDescription || "");
  return `kwgen|${ws}|${desc}`;
}

export function normalizeDescription(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 256);
}
