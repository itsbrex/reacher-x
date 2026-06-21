"use node";

import type { ProviderMetadata } from "ai";
import { z } from "zod";
import { extractUsage, getRoutingTelemetry, robustGenerateObject } from "./ai";
import { buildProfileGenerationPrompt } from "../agents/prompts";
import { icpSchema, type ICP } from "../agents/tools/schemas";
import {
  getWorkspaceUseCase,
  type WorkspaceUseCaseKey,
} from "../../shared/lib/workspaceUseCases";

const improvedDescriptionAndIcpsSchema = z.object({
  improvedDescription: z
    .string()
    .describe(
      "An improved, clear, and compelling business description (2-3 sentences)"
    ),
  icps: z
    .array(icpSchema)
    .min(2)
    .max(4)
    .describe("2-4 distinct Ideal Customer Profile segments"),
});

type SetupGenerationUsage = ReturnType<typeof extractUsage>;

export type SetupGenerationTelemetry = {
  model: string;
  providerHint: string;
  providerMetadata?: ProviderMetadata;
  routing: "fast";
  timeoutMs: number;
  usage: SetupGenerationUsage;
  request: {
    prompt: string;
    system: string;
  };
  response: {
    icpCount: number;
    icpTitles: string[];
    improvedDescription: string;
  };
};

export type SetupGenerationDraft = {
  improvedDescription: string;
  icps: ICP[];
  telemetry: SetupGenerationTelemetry;
};

type GenerateSetupDraftArgs = {
  currentProfiles?: Array<{
    channels: string[];
    description: string;
    painPoints: string[];
    title: string;
  }> | null;
  currentImprovedDescription?: string | null;
  keyProblems?: string[];
  operation?: string;
  revisionFeedback?: string | null;
  seedDescription: string;
  targetAudience?: string[];
  useCaseKey?: WorkspaceUseCaseKey | null;
};

function formatCurrentProfiles(
  profiles: NonNullable<GenerateSetupDraftArgs["currentProfiles"]>
): string {
  return profiles
    .map(
      (profile, index) =>
        `${index + 1}. ${profile.title}
Description: ${profile.description}
Pain points: ${profile.painPoints.join("; ")}
Channels: ${profile.channels.join(", ")}`
    )
    .join("\n\n");
}

function buildSetupGenerationUserPrompt(args: GenerateSetupDraftArgs): string {
  const useCase = getWorkspaceUseCase(args.useCaseKey);
  const trimmedFeedback = args.revisionFeedback?.trim() || null;
  const trimmedCurrentDescription =
    args.currentImprovedDescription?.trim() || null;
  const currentProfiles =
    args.currentProfiles?.filter(
      (profile) => profile.title.trim().length > 0
    ) ?? [];

  let prompt = `Improve this business description and create 2-4 ${useCase.profileLabelPlural}:

**Original Description:**
${args.seedDescription}`;

  if (args.targetAudience?.length) {
    prompt += `\n\n**Known Target Audience:** ${args.targetAudience.join(", ")}`;
  }

  if (args.keyProblems?.length) {
    prompt += `\n\n**Problems Solved:** ${args.keyProblems.join(", ")}`;
  }

  if (trimmedCurrentDescription) {
    prompt += `\n\n**Current Improved Description:**\n${trimmedCurrentDescription}`;
  }

  if (currentProfiles.length > 0) {
    prompt += `\n\n**Current ${useCase.profileLabelPlural}:**\n${formatCurrentProfiles(currentProfiles)}`;
  }

  if (trimmedFeedback) {
    prompt += `\n\n**Revision Feedback:**\n${trimmedFeedback}

Revise the current draft to address the feedback.

Return:
1. A full replacement improved description (2-3 sentences)
2. A full replacement set of 2-4 distinct ${useCase.profileLabelPlural.toLowerCase()}`;
    return prompt;
  }

  prompt += `

Create:
1. A clear, compelling improved description (2-3 sentences)
2. 2-4 distinct profiles with pain points and preferred social channels`;

  return prompt;
}

export async function generateSetupDraft(
  args: GenerateSetupDraftArgs
): Promise<SetupGenerationDraft> {
  const system = buildProfileGenerationPrompt(args.useCaseKey);
  const prompt = buildSetupGenerationUserPrompt(args);
  const routing = "fast" as const;
  const routingTelemetry = getRoutingTelemetry(routing);

  const { object, model, usage, providerMetadata } = await robustGenerateObject(
    {
      operation: args.operation ?? "generateImprovedDescriptionAndICPs",
      schema: improvedDescriptionAndIcpsSchema,
      system,
      prompt,
      temperature: 0.6,
      maxRetries: 2,
      routing,
    }
  );

  return {
    improvedDescription: object.improvedDescription,
    icps: object.icps,
    telemetry: {
      model,
      providerHint: routingTelemetry.providerLabel,
      providerMetadata: providerMetadata as ProviderMetadata | undefined,
      routing,
      timeoutMs: routingTelemetry.timeoutMs,
      usage,
      request: {
        prompt,
        system,
      },
      response: {
        icpCount: object.icps.length,
        icpTitles: object.icps.map((profile) => profile.title),
        improvedDescription: object.improvedDescription,
      },
    },
  };
}
