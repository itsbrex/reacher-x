// convex/agents/index.ts
// Agent definitions using @convex-dev/agent + OpenRouter

import { Agent } from "@convex-dev/agent";
import { wrapLanguageModel } from "ai";
import { components, internal } from "../_generated/api";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  PINNED_AGENT_MODEL,
  PINNED_AGENT_PROVIDER_OPTIONS,
  getOpenRouterExtraBody,
} from "../lib/ai";
import {
  openRouterMetadataMiddleware,
  sanitizeProviderMetadataForConvex,
} from "../lib/agentMetadata";
import { buildMainAgentPrompt, buildSetupAgentPrompt } from "./prompts";
import { DEFAULT_WORKSPACE_USE_CASE_KEY } from "../../shared/lib/workspaceUseCases";
import {
  analyzeUrl,
  generateImprovedDescriptionAndICPs,
  getUserStatus,
  createWorkspace,
  updateWorkspace,
  convertToSocialQueries,
  searchProspects,
  qualifyProspect,
  enrichProspect,
  rememberWorkspaceMemory,
  searchWorkspaceMemories,
  continueProspectThread,
  listProspectPlans,
  updatePlansBatch,
} from "./tools";
import {
  approveSocialActionRequest,
  approveTask,
  askHuman,
  cancelPlan,
  deletePlan,
  displayEntity,
  getProspectPlan,
  getSocialContext,
  inspectWorkspace,
  pausePlan,
  researchProspect,
  resumePlan,
  socialAction,
} from "./outreach/tools";

// ============================================================================
// Lazy Model Provider
// ============================================================================

/**
 * Creates a language model using OpenRouter.
 * The API key is read from environment at runtime.
 *
 * OpenRouter provides:
 * - Access to 400+ models
 * - Auto fallbacks
 * - Provider routing
 * - Tool calling support
 */
function getOpenRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[Agent] Missing OPENROUTER_API_KEY environment variable. " +
        "Get it from: https://openrouter.ai/settings/keys"
    );
  }
  return createOpenRouter({
    apiKey,
    headers: {
      "HTTP-Referer": "https://reacherx.com",
      "X-Title": "ReacherX",
    },
  });
}

const openrouter = getOpenRouterProvider();
const workspaceLanguageModel = wrapLanguageModel({
  // Pin tool-calling setup runs to the validated Cerebras route. This avoids
  // provider roulette for multi-step streamed agent turns.
  model: openrouter(PINNED_AGENT_MODEL, {
    extraBody: getOpenRouterExtraBody(PINNED_AGENT_PROVIDER_OPTIONS),
  }) as any,
  middleware: openRouterMetadataMiddleware,
});

const mainAgentBaseTools = {
  // Workspace context + discovery
  inspectWorkspace,
  searchProspects,
  listProspectPlans,
  updatePlansBatch,
  // Selected prospect context
  getSocialContext,
  getProspectPlan,
  researchProspect,
  continueProspectThread,
  // Plan management
  pausePlan,
  resumePlan,
  cancelPlan,
  deletePlan,
  // Direct actions + UI
  displayEntity,
  socialAction,
  approveSocialActionRequest,
  approveTask,
  askHuman,
  // Memory
  rememberWorkspaceMemory,
  searchWorkspaceMemories,
} as const;

export const mainAgent = new Agent(components.agent, {
  name: "Main Agent",
  languageModel: workspaceLanguageModel,
  instructions: buildMainAgentPrompt(DEFAULT_WORKSPACE_USE_CASE_KEY),
  tools: mainAgentBaseTools,
  maxSteps: 15,
  contextOptions: {
    recentMessages: 20,
  },
  usageHandler: async (ctx, args) => {
    await ctx.runMutation(internal.agentTelemetry.insertUsageEvent, {
      userId: args.userId,
      threadId: args.threadId,
      agentName: args.agentName,
      model: args.model,
      provider: args.provider,
      usage: args.usage,
      providerMetadata: sanitizeProviderMetadataForConvex(
        args.providerMetadata
      ),
    });
  },
});

// ============================================================================
// Setup Agent
// ============================================================================

/**
 * The Setup Agent handles user onboarding, workspace creation, and ICP generation.
 *
 * Flows:
 * 1. New User: Greet → Get URL/Description → Analyze → Generate ICPs → Approve → Create Workspace
 * 2. Incomplete first workspace: Greet → Get URL/Description → Generate ICPs → Approve → Create Workspace
 * 3. New Workspace: Same as #1 but creates new instead of default
 *
 * @see AGENT_CONTEXT.txt for detailed flow documentation
 */
export const setupAgent = new Agent(components.agent, {
  name: "Setup Agent",
  languageModel: workspaceLanguageModel,
  instructions: buildSetupAgentPrompt(DEFAULT_WORKSPACE_USE_CASE_KEY),
  tools: {
    // Setup tools
    analyzeUrl,
    generateImprovedDescriptionAndICPs,
    getUserStatus,
    createWorkspace,
    updateWorkspace,
    // Prospecting tools
    convertToSocialQueries,
    searchProspects,
    // Qualification tools
    qualifyProspect,
    // Enrichment tools
    enrichProspect,
    // Workspace memory tools
    rememberWorkspaceMemory,
    searchWorkspaceMemories,
    // Main △ Agent fan-out (workspace-wide plan control)
    listProspectPlans,
    updatePlansBatch,
  },
  // Allow multiple tool calls for complex flows
  maxSteps: 15,
  // Customize model behavior
  contextOptions: {
    recentMessages: 20,
  },
  usageHandler: async (ctx, args) => {
    await ctx.runMutation(internal.agentTelemetry.insertUsageEvent, {
      userId: args.userId,
      threadId: args.threadId,
      agentName: args.agentName,
      model: args.model,
      provider: args.provider,
      usage: args.usage,
      providerMetadata: sanitizeProviderMetadataForConvex(
        args.providerMetadata
      ),
    });
  },
});

// ============================================================================
// Re-exports
// ============================================================================

// Export prompts for external use
export * from "./prompts";

// Export tools for testing/direct use
export * from "./tools";
