"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { outreachAgent } from "./agents/outreach";
import { buildOutreachAgentPrompt } from "./agents/prompts";
import {
  resolveSocialContext,
  type ResolvedSocialContext,
} from "./agents/outreach/tools/socialContextShared";
import type { ToolContext } from "./agents/outreach/tools/helpers";
import { repairOverLimitCommentTasks } from "./agents/outreach/tools/xPostLimitHelpers";
import { internalAction } from "./lib/functionBuilders";
import { AUTO_PLAN_GENERATION_THRESHOLD } from "./lib/outreachCore";
import {
  assessAutoPlanGrounding,
  autoPlanDraftSchema,
  buildAutoPlanResearchQueries,
  buildGroundedAutoPlanPrompt,
  normalizeAutoPlanDraft,
  validateAutoPlanDraftAgainstGrounding,
  type AutoPlanGenerationResult,
  type AutoPlanGroundingContext,
  type AutoPlanSocialPost,
} from "./lib/autoPlanCore";
import { getStyleMemoryCategory } from "./lib/styleSourceCore";
import { loadAgentProspectProfileContext } from "./lib/prospectProfileContextHelpers";
import { persistRawModelResponse } from "./lib/modelTelemetry";
import { readWebPages, runDeepResearch } from "./lib/researchCore";
import { getStringProperty, isRecord } from "./lib/typeGuards";
import { autoPlanGenerationResultValidator } from "./validators";
import { getCurrentUTCTimestamp } from "../shared/lib/utils/time/timeUtils";
import { selectProfileWebsiteHref } from "../shared/lib/twitter/profileLinks";
import { getWorkspaceUseCase } from "../shared/lib/workspaceUseCases";

type Settled<T> =
  | { value: T; error?: undefined }
  | { value: null; error: string };

async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { value: await promise };
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function toPromptSafePosts(
  context: ResolvedSocialContext | null
): AutoPlanSocialPost[] {
  return (context?.posts ?? []).map((post) => ({
    id: post.id,
    platform: post.platform,
    createdAt: post.createdAt,
    textPreview: post.textPreview,
    url: post.url,
    metrics: post.metrics,
    isReply: post.isReply,
  }));
}

function countStoredSignals(prospect: {
  briefIntro?: string;
  matchReason?: string;
  matchedKeywords?: string[];
  evidencePosts?: unknown[];
  painPoints?: Array<{ pain: string }>;
  finance?: { displayValue: string };
}): number {
  return [
    prospect.briefIntro,
    prospect.matchReason,
    prospect.finance?.displayValue,
    ...(prospect.matchedKeywords ?? []),
    ...(prospect.painPoints?.map((painPoint) => painPoint.pain) ?? []),
    ...(prospect.evidencePosts ?? []),
  ].filter(Boolean).length;
}

/**
 * Mandatory grounding and structured generation for one automatic plan.
 * The durable workflow retries this idempotent action when external providers
 * or the model fail before a valid plan is persisted.
 */
export const generateGroundedAutoPlanDraft = internalAction({
  args: {
    prospectId: v.id("prospects"),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    threadId: v.string(),
  },
  returns: autoPlanGenerationResultValidator,
  handler: async (
    ctx,
    args
  ): Promise<AutoPlanGenerationResult<Id<"outreachPlans">>> => {
    const [prospect, workspace, workspaceInspection, existingPlan]: [
      Awaited<
        ReturnType<
          typeof ctx.runQuery<typeof internal.prospects.getProspectInternal>
        >
      >,
      Awaited<
        ReturnType<typeof ctx.runQuery<typeof internal.workspaces.getById>>
      >,
      Awaited<
        ReturnType<
          typeof ctx.runQuery<
            typeof internal.workspaces.getWorkspaceInspectionInternal
          >
        >
      >,
      { plan: { _id: Id<"outreachPlans"> }; tasks: unknown[] } | null,
    ] = await Promise.all([
      ctx.runQuery(internal.prospects.getProspectInternal, {
        prospectId: args.prospectId,
      }),
      ctx.runQuery(internal.workspaces.getById, {
        workspaceId: args.workspaceId,
      }),
      ctx.runQuery(internal.workspaces.getWorkspaceInspectionInternal, {
        workspaceId: args.workspaceId,
      }),
      ctx.runQuery(internal.outreach.getProspectActivePlanInternal, {
        prospectId: args.prospectId,
      }),
    ]);

    if (existingPlan) {
      return {
        success: true,
        planId: existingPlan.plan._id,
        threadId: args.threadId,
        existing: true,
      };
    }

    if (
      !prospect ||
      !workspace ||
      !workspaceInspection ||
      prospect.workspaceId !== args.workspaceId ||
      prospect.userId !== args.userId
    ) {
      throw new Error(
        "Auto plan context does not match the prospect workspace"
      );
    }
    if (
      prospect.origin === "setup_preview" ||
      prospect.status === "archived" ||
      (prospect.enrichmentStatus !== "enriched" &&
        prospect.enrichmentStatus !== "partial") ||
      typeof prospect.qualificationScore !== "number" ||
      prospect.qualificationScore < AUTO_PLAN_GENERATION_THRESHOLD
    ) {
      throw new Error("Prospect is no longer eligible for automatic planning");
    }
    if (
      workspace.styleProfileStatus !== "ready" ||
      typeof workspace.styleProfileVersion !== "number" ||
      workspace.styleProfileVersion <= 0
    ) {
      throw new Error("Workspace writing style is not ready");
    }

    const paidEligibility = await ctx.runQuery(
      internal.plans.getPaidFeatureEligibilityByUserId,
      { userId: args.userId }
    );
    if (!paidEligibility.allowed) {
      throw new Error(
        paidEligibility.reason ??
          "Workspace plan does not include outreach plans"
      );
    }

    const [prospectProfileContext, styleMemories] = await Promise.all([
      loadAgentProspectProfileContext(ctx, prospect),
      ctx.runQuery(internal.memory.listPinnedWorkspaceMemoriesInternal, {
        workspaceId: String(args.workspaceId),
        category: getStyleMemoryCategory(
          prospect.platform === "linkedin" ? "linkedin" : "twitter"
        ),
        limit: 1,
      }),
    ]);
    const styleMemory = styleMemories[0];
    const parsedStyle = isRecord(styleMemory?.parsed)
      ? getStringProperty(styleMemory.parsed, "narrative")
      : undefined;
    const writingStyle = parsedStyle || styleMemory?.promptLine || "";

    const socialContextCtx = {
      ...ctx,
      agent: outreachAgent,
      userId: String(args.userId),
      threadId: args.threadId,
      messageId: undefined,
    } as unknown as ToolContext;
    const websiteUrl = selectProfileWebsiteHref(
      prospect.websiteHref,
      prospect.websiteUrl
    );
    const researchQueries = buildAutoPlanResearchQueries({
      displayName: prospect.displayName || prospect.externalId,
      title: prospect.title,
      company: prospect.company,
      workspaceDescription: workspaceInspection.description,
    });

    const [profileOutcome, postsOutcome, websiteOutcome, researchOutcome] =
      await Promise.all([
        settle(
          resolveSocialContext(socialContextCtx, {
            mode: "platform_profile",
            platform: "auto",
            limit: 10,
          })
        ),
        settle(
          resolveSocialContext(socialContextCtx, {
            mode: "posts",
            platform: "auto",
            limit: 10,
            includeReplies: true,
          })
        ),
        settle(readWebPages(websiteUrl ? [websiteUrl] : [])),
        settle(runDeepResearch(researchQueries)),
      ]);

    const websiteResearch = websiteOutcome.value ?? [];
    const webResearch = researchOutcome.value ?? [];
    const retrievalErrors = [
      profileOutcome.error
        ? `platform profile refresh: ${profileOutcome.error}`
        : undefined,
      postsOutcome.error
        ? `recent posts refresh: ${postsOutcome.error}`
        : undefined,
      websiteOutcome.error
        ? `website research: ${websiteOutcome.error}`
        : undefined,
      researchOutcome.error
        ? `web research: ${researchOutcome.error}`
        : undefined,
      ...websiteResearch
        .filter((page) => page.error)
        .map((page) => `website ${page.url}: ${page.error}`),
      ...webResearch
        .filter((result) => result.error)
        .map((result) => `research ${result.query}: ${result.error}`),
    ].filter((message): message is string => Boolean(message));

    const recentPosts = toPromptSafePosts(postsOutcome.value);
    const groundingContext: AutoPlanGroundingContext = {
      generatedAt: getCurrentUTCTimestamp(),
      workspace: {
        ...workspaceInspection,
        useCaseKey: workspaceInspection.useCaseKey
          ? String(workspaceInspection.useCaseKey)
          : null,
      },
      prospectProfileContext,
      storedSignalCount: countStoredSignals(prospect),
      writingStyle,
      freshPlatformProfile: profileOutcome.value?.profile ?? null,
      recentPosts,
      websiteResearch,
      webResearch,
      retrievalErrors,
    };
    const groundingAssessment = assessAutoPlanGrounding(groundingContext);
    if (!groundingAssessment.ready) {
      throw new Error(
        `Auto plan grounding incomplete: ${groundingAssessment.reasons.join("; ")}`
      );
    }

    const useCase = getWorkspaceUseCase(workspace.useCaseKey);
    const generated = await outreachAgent.generateObject(
      ctx,
      { threadId: args.threadId, userId: String(args.userId) },
      {
        schema: autoPlanDraftSchema,
        system: buildOutreachAgentPrompt(useCase),
        prompt: buildGroundedAutoPlanPrompt({
          prospectName: prospect.displayName || prospect.externalId,
          prospectTitle: prospect.title || "prospect",
          qualificationScore: prospect.qualificationScore,
          entitySingularLower: useCase.entitySingular.toLowerCase(),
          successDefinition: useCase.promptContext.successDefinition,
          outreachGoal: useCase.promptContext.outreachGoal,
          context: groundingContext,
        }),
        maxOutputTokens: 3_000,
      }
    );
    await persistRawModelResponse(ctx, {
      userId: String(args.userId),
      threadId: args.threadId,
      agentName: "Outreach Agent",
      request: generated.request,
      response: generated.response,
      providerMetadata: generated.providerMetadata,
    });

    const normalizedDraft = normalizeAutoPlanDraft(
      autoPlanDraftSchema.parse(generated.object)
    );
    const validationErrors = validateAutoPlanDraftAgainstGrounding({
      draft: normalizedDraft,
      recentPosts,
    });
    if (validationErrors.length > 0) {
      throw new Error(
        `Generated plan failed validation: ${validationErrors.join("; ")}`
      );
    }

    const repairedTasks =
      prospect.platform === "twitter"
        ? (
            await repairOverLimitCommentTasks({
              ctx,
              userId: args.userId,
              tasks: normalizedDraft.tasks,
            })
          ).tasks
        : normalizedDraft.tasks;
    const planTasks = repairedTasks.map((task) => ({
      ...task,
      approvalContext:
        task.type === "comment" || task.type === "dm"
          ? { platform: prospect.platform }
          : undefined,
    }));

    let planId: Id<"outreachPlans">;
    try {
      planId = await ctx.runMutation(internal.outreach.createPlan, {
        prospectId: args.prospectId,
        workspaceId: args.workspaceId,
        userId: args.userId,
        strategy: normalizedDraft.strategy,
        tasks: planTasks,
        threadId: args.threadId,
      });
    } catch (error) {
      const racedPlan = await ctx.runQuery(
        internal.outreach.getProspectActivePlanInternal,
        { prospectId: args.prospectId }
      );
      if (!racedPlan) {
        throw error;
      }
      planId = racedPlan.plan._id;
    }

    return {
      success: true,
      planId,
      threadId: args.threadId,
      existing: false,
    };
  },
});
