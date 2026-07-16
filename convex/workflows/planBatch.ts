import { v } from "convex/values";
import { internal } from "../_generated/api";
import { workflow } from "../lib/workflow";
import { getPlanBatchWorkflowEventName } from "../lib/planBatchCore";

export const planBatchWorkflow = workflow.define({
  args: {
    runId: v.id("planBatchRuns"),
  },
  returns: v.object({
    status: v.string(),
  }),
  handler: async (step, { runId }): Promise<{ status: string }> => {
    while (true) {
      const selection = await step.runMutation(
        internal.planBatches.selectPlanBatchTargetsPage,
        { runId }
      );
      if (!selection || selection.done) {
        break;
      }
    }

    let run = await step.runQuery(
      internal.planBatches.getPlanBatchRunInternal,
      { runId }
    );
    if (!run) {
      return { status: "missing" };
    }

    if (run.status === "awaiting_confirmation") {
      await step.awaitEvent({
        name: getPlanBatchWorkflowEventName(String(runId)),
      });
      run = await step.runQuery(internal.planBatches.getPlanBatchRunInternal, {
        runId,
      });
      if (!run) {
        return { status: "missing" };
      }
    }

    if (run.status === "cancelled" || run.status === "failed") {
      return { status: run.status };
    }
    if (run.status === "completed" || run.status === "partial") {
      return { status: run.status };
    }

    while (true) {
      const dispatch = await step.runMutation(
        internal.planBatches.dispatchPlanBatchPage,
        { runId }
      );
      if (!dispatch || dispatch.done) {
        break;
      }
    }

    return { status: "dispatched" };
  },
});
