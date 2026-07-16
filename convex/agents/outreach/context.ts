import type { ToolCtx } from "@convex-dev/agent";
import type { Id } from "../../_generated/dataModel";

export type OutreachAgentCustomContext = {
  planBatchItemId?: Id<"planBatchItems">;
};

export type OutreachToolContext = ToolCtx & OutreachAgentCustomContext;
