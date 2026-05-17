export function buildSetupHref(threadId?: string | null): string {
  if (!threadId) {
    return "/agent/setup";
  }

  const params = new URLSearchParams();
  params.set("threadId", threadId);
  return `/agent/setup?${params.toString()}`;
}
