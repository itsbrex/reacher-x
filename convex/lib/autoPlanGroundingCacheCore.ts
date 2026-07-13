export const AUTO_PLAN_GROUNDING_CACHE_TTL_MS = 6 * 60 * 60 * 1_000;

export function isAutoPlanGroundingStageFresh(
  completedAt: number | undefined,
  now: number
) {
  return (
    typeof completedAt === "number" &&
    completedAt <= now &&
    now - completedAt <= AUTO_PLAN_GROUNDING_CACHE_TTL_MS
  );
}
