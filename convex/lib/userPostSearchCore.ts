export type UserPostSearchOutcome = "success" | "no_results" | "error";

export function getUserPostSearchOutcome(args: {
  postCount: number;
  error?: string;
}): UserPostSearchOutcome {
  if (args.error) return "error";
  return args.postCount > 0 ? "success" : "no_results";
}

export function isUserPostSearchSuccessful(
  outcome: UserPostSearchOutcome
): boolean {
  return outcome !== "error";
}
