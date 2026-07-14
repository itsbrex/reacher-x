import type { Doc } from "../_generated/dataModel";

export type QualificationAuditApplicationDecision =
  | { outcome: "apply" }
  | { outcome: "already_applied" }
  | { outcome: "recover_applied" }
  | { outcome: "skip_missing"; reason: string }
  | { outcome: "skip_stale"; reason: string };

export function getQualificationAuditApplicationDecision(args: {
  item: Pick<
    Doc<"qualificationAuditItems">,
    "applicationOutcome" | "previousScore" | "proposedScore" | "proposedStatus"
  >;
  prospect: Pick<
    Doc<"prospects">,
    "qualificationStatus" | "qualificationScore"
  > | null;
}): QualificationAuditApplicationDecision {
  if (args.item.applicationOutcome === "applied") {
    return { outcome: "already_applied" };
  }
  if (!args.prospect) {
    return { outcome: "skip_missing", reason: "Prospect no longer exists" };
  }
  if (!args.item.proposedStatus || args.item.proposedScore === undefined) {
    return {
      outcome: "skip_stale",
      reason: "Audit item has no complete proposed decision",
    };
  }
  if (
    args.item.proposedStatus === "disqualified" &&
    args.prospect.qualificationStatus === args.item.proposedStatus &&
    args.prospect.qualificationScore === args.item.proposedScore
  ) {
    return { outcome: "recover_applied" };
  }
  if (args.prospect.qualificationStatus !== "qualified") {
    return {
      outcome: "skip_stale",
      reason: `Prospect qualification status changed to ${args.prospect.qualificationStatus}`,
    };
  }
  if (
    args.item.previousScore !== undefined &&
    args.prospect.qualificationScore !== args.item.previousScore
  ) {
    return {
      outcome: "skip_stale",
      reason: "Prospect qualification score changed after the audit snapshot",
    };
  }
  return { outcome: "apply" };
}

export function calculateQualificationRate(
  qualifiedCount: number,
  prospectsFound: number
): number {
  if (prospectsFound <= 0) return 0;
  return (Math.max(0, qualifiedCount) / prospectsFound) * 100;
}
