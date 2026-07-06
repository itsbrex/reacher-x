export interface OutreachPlanPreviewState<TTask> {
  status: string;
  rationale: string;
  tasks: TTask[];
  actionsDisabled: boolean;
  showPlanDisabled: boolean;
}

interface LivePlanPreviewData<TTask> {
  plan: {
    status: string;
    strategy: {
      rationale: string;
    };
  };
  tasks: TTask[];
}

export function resolveOutreachPlanPreviewState<TTask>({
  planId,
  livePlanData,
  fallbackStatus,
  fallbackRationale,
  fallbackTasks,
  isPending = false,
}: {
  planId?: string | null;
  livePlanData?: LivePlanPreviewData<TTask> | null;
  fallbackStatus: string;
  fallbackRationale: string;
  fallbackTasks: TTask[];
  isPending?: boolean;
}): OutreachPlanPreviewState<TTask> | null {
  if (planId && isPending) {
    return {
      status: "loading",
      rationale: fallbackRationale,
      tasks: fallbackTasks,
      actionsDisabled: true,
      showPlanDisabled: true,
    };
  }

  if (planId && livePlanData === null) {
    return {
      status: "deleted",
      rationale: fallbackRationale,
      tasks: fallbackTasks,
      actionsDisabled: true,
      showPlanDisabled: true,
    };
  }

  return {
    status: livePlanData?.plan.status ?? fallbackStatus,
    rationale: livePlanData?.plan.strategy.rationale ?? fallbackRationale,
    tasks: livePlanData?.tasks ?? fallbackTasks,
    actionsDisabled: false,
    showPlanDisabled: false,
  };
}
