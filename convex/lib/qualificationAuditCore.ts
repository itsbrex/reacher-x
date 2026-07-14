import type { Doc } from "../_generated/dataModel";
import { getNestedRecord, getStringProperty, isRecord } from "./typeGuards";
import {
  getWorkflowEvidencePostId,
  sanitizeProspectDataForWorkflow,
  sanitizeProspectEvidencePostsForWorkflow,
} from "./workflowSafeProspect";

export interface QualificationAuditEvidence {
  posts: Array<Record<string, unknown>>;
  existingCount: number;
  origin: "existing" | "refetched" | "mixed";
}

export function buildQualificationAuditKeywordContext(
  workspace: Doc<"workspaces">
): { evaluationKeywords: string[]; searchKeywords: string[] } {
  const painPoints = (workspace.icps ?? []).flatMap(
    (icp) => icp.painPoints ?? []
  );
  const qualificationKeywords = (workspace.icps ?? []).flatMap(
    (icp) => icp.qualificationKeywords ?? []
  );
  const dedupe = (values: string[]) => [
    ...new Set(values.map((value) => value.trim()).filter(Boolean)),
  ];

  return {
    evaluationKeywords: dedupe(painPoints),
    searchKeywords: dedupe([...qualificationKeywords, ...painPoints]),
  };
}

export function getQualificationAuditProspectContext(
  prospect: Doc<"prospects">
): {
  displayName: string;
  profileData: Record<string, unknown>;
  existingEvidence: Array<Record<string, unknown>>;
  discoveryQueries: string[];
  providerIdentity: string | null;
} {
  const prospectData = sanitizeProspectDataForWorkflow(
    prospect.data,
    prospect.platform
  );
  const profileData =
    getNestedRecord(prospectData, "user") ??
    getNestedRecord(prospectData, "author") ??
    prospectData;
  const existingEvidence = sanitizeProspectEvidencePostsForWorkflow(
    Array.isArray(prospect.evidencePosts) ? prospect.evidencePosts : [],
    prospect.platform
  );
  const discoveryQueries = Array.isArray(
    prospect.discoveryContext?.matchedQueries
  )
    ? prospect.discoveryContext.matchedQueries
    : [];

  let providerIdentity: string | null = null;
  if (prospect.platform === "twitter") {
    providerIdentity =
      getStringProperty(profileData, "screen_name") ??
      getStringProperty(profileData, "handle") ??
      null;
  } else {
    const socialProfiles = isRecord(prospect.socialProfiles)
      ? prospect.socialProfiles
      : null;
    const linkedin = isRecord(socialProfiles?.linkedin)
      ? socialProfiles.linkedin
      : null;
    providerIdentity =
      prospect.linkedinUserUrn ??
      getStringProperty(linkedin, "urn") ??
      getStringProperty(profileData, "urn") ??
      null;
  }

  return {
    displayName:
      prospect.displayName ??
      getStringProperty(profileData, "name") ??
      prospect.externalId,
    profileData,
    existingEvidence,
    discoveryQueries,
    providerIdentity,
  };
}

export function mergeQualificationAuditEvidence(args: {
  existing: Array<Record<string, unknown>>;
  refetched: Array<Record<string, unknown>>;
}): QualificationAuditEvidence {
  const seen = new Set<string>();
  const posts = [...args.existing, ...args.refetched].filter((post) => {
    const id = getWorkflowEvidencePostId(post);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return {
    posts,
    existingCount: args.existing.length,
    origin:
      args.refetched.length === 0
        ? "existing"
        : args.existing.length === 0
          ? "refetched"
          : "mixed",
  };
}
