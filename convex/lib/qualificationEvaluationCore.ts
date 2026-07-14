"use node";

import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
  qualifyProspectCore,
  type QualificationCoreParams,
  type QualificationResult,
} from "./qualificationCore";
import { readWebPages } from "./researchCore";
import { getWorkflowEvidencePostId } from "./workflowSafeProspect";

type EvaluationArgs = Omit<QualificationCoreParams, "externalArticles"> & {
  workspaceId: Id<"workspaces">;
  prospectId: Id<"prospects">;
};

/**
 * Evaluates persisted social evidence plus any readable linked articles.
 * This function has no database writes, so workflows and audits share the
 * exact same qualification behavior without sharing orchestration.
 */
export async function evaluateQualificationWithExternalArticles(
  ctx: ActionCtx,
  args: EvaluationArgs
): Promise<QualificationResult> {
  const articleSourcePostIdsByUrl = new Map<string, string[]>();
  for (const post of args.evidencePosts) {
    const sourcePostId = getWorkflowEvidencePostId(post);
    const externalUrls = Array.isArray(post.externalUrls)
      ? post.externalUrls.filter(
          (value): value is string => typeof value === "string"
        )
      : [];
    if (!sourcePostId) continue;

    for (const url of externalUrls) {
      articleSourcePostIdsByUrl.set(url, [
        ...(articleSourcePostIdsByUrl.get(url) ?? []),
        sourcePostId,
      ]);
    }
  }

  const articleReads =
    articleSourcePostIdsByUrl.size > 0
      ? await readWebPages([...articleSourcePostIdsByUrl.keys()], {
          ctx,
          consumer: "qualification.external_articles",
          workspaceId: args.workspaceId,
          prospectId: args.prospectId,
        })
      : [];
  const externalArticles = articleReads.flatMap((article) => {
    if (!article.author || !article.snippet) return [];

    return (articleSourcePostIdsByUrl.get(article.url) ?? []).map(
      (sourcePostId) => ({
        sourcePostId,
        url: article.url,
        author: article.author as string,
        text: article.snippet as string,
      })
    );
  });

  return await qualifyProspectCore({
    ...args,
    externalArticles,
  });
}
