import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "rollover plan usage cycles",
  { hours: 1 },
  internal.planUsage.rolloverStaleUsageCycles
);

crons.interval(
  "pause inactive workspaces",
  { hours: 1 },
  internal.workspaces.pauseInactiveWorkspaces
);

crons.interval(
  "retry failed automatic plans after provider recovery",
  { minutes: 2 },
  internal.workflows.autoPlanRecovery.retryFailedAutoPlansCron
);

export default crons;
