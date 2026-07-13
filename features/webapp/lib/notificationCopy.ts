export function normalizeNotificationCopy(
  value: string,
  type: "prospects_found" | string
): string {
  const currentCopy = value
    .replace(/\bX's public API\b/g, "The X/Twitter public API")
    .replace(
      /\ban X API policy mismatch\b/g,
      "an X/Twitter API policy mismatch"
    );

  return type === "prospects_found"
    ? currentCopy.replace(/\b(\d+) on X\b(?!\/Twitter)/g, "$1 on X/Twitter")
    : currentCopy;
}
