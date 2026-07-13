import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import {
  formatAgentProspectProfileContext,
  type AgentProspectProfileRelatedContext,
} from "./prospectProfileContextCore";

const PROFILE_PANEL_CONTEXT_LIMIT = 20;

type ProspectProfileContextReader = Pick<ActionCtx, "runQuery">;

/**
 * Loads the bounded related records visible in the prospect profile panel and
 * combines them with the canonical prospect snapshot before model generation.
 */
export async function loadAgentProspectProfileContext(
  ctx: ProspectProfileContextReader,
  prospect: Doc<"prospects">
): Promise<string> {
  const [activePlan, interactionHistory, recentActivityLog] = await Promise.all(
    [
      ctx.runQuery(internal.outreach.getProspectActivePlanInternal, {
        prospectId: prospect._id,
      }),
      ctx.runQuery(
        internal.interactions.getProspectInteractionHistoryInternal,
        {
          userId: prospect.userId,
          prospectId: prospect._id,
          platform: "all",
          kinds: ["dm", "comment", "reply"],
          direction: "all",
          limit: PROFILE_PANEL_CONTEXT_LIMIT,
        }
      ),
      ctx.runQuery(internal.outreach.getProspectActivityLogInternal, {
        prospectId: prospect._id,
        limit: PROFILE_PANEL_CONTEXT_LIMIT,
      }),
    ]
  );

  const relatedContext: AgentProspectProfileRelatedContext = {
    currentOutreachPlan: activePlan
      ? {
          status: activePlan.plan.status,
          strategy: activePlan.plan.strategy,
          version: activePlan.plan.version,
          createdAt: activePlan.plan._creationTime,
          updatedAt: activePlan.plan.updatedAt,
          tasks: activePlan.tasks
            .slice(0, PROFILE_PANEL_CONTEXT_LIMIT)
            .map((task) => ({
              order: task.order,
              type: task.type,
              description: task.description,
              status: task.status,
              content: task.content,
              targetTweetId: task.targetTweetId,
            })),
        }
      : null,
    interactionHistory,
    recentActivityLog: recentActivityLog.map((activity) => ({
      createdAt: activity._creationTime,
      type: activity.type,
      title: activity.title,
      description: activity.description,
    })),
  };

  return formatAgentProspectProfileContext(prospect, relatedContext);
}
