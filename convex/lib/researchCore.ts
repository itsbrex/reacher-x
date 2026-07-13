"use node";

/**
 * Deep research core (Layer 3) built on Exa.
 *
 * Runs neural web searches with content extraction so the △ Agent can
 * research prospects and companies before generating or refining plans.
 */

import Exa from "exa-js";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { acquireExaApiBudget } from "./exaApiBudget";
import {
  EXA_CONTENT_COST_PER_PAGE_USD,
  EXA_SEARCH_COST_PER_REQUEST_USD,
  trackProviderRequest,
} from "./providerReliability";

const MAX_QUERIES = 4;
const RESULTS_PER_QUERY = 4;
const SNIPPET_MAX_CHARS = 1200;

let exaClient: Exa | null = null;

function getExaClient(): Exa {
  if (!exaClient) {
    const apiKey = process.env.EXA_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "EXA_API_KEY is not configured. Set it via `npx convex env set`."
      );
    }
    exaClient = new Exa(apiKey);
  }
  return exaClient;
}

export interface ResearchFinding {
  title: string;
  url: string;
  publishedDate?: string;
  snippet: string;
}

export interface ResearchQueryOutcome {
  query: string;
  findings: ResearchFinding[];
  error?: string;
}

export interface WebPageReadOutcome {
  url: string;
  title: string;
  snippet: string;
  error?: string;
}

export type ResearchProviderContext = {
  ctx: ActionCtx;
  consumer: string;
  workspaceId?: Id<"workspaces">;
  prospectId?: Id<"prospects">;
  autoPlanRunId?: Id<"autoPlanRuns">;
};

/** Read clean page text directly from known URLs already stored on a profile. */
export async function readWebPages(
  urls: string[],
  providerContext: ResearchProviderContext
): Promise<WebPageReadOutcome[]> {
  const exa = getExaClient();
  const limitedUrls = [
    ...new Set(urls.map((url) => url.trim()).filter(Boolean)),
  ].slice(0, 2);

  if (limitedUrls.length === 0) {
    return [];
  }

  try {
    const response = await trackProviderRequest({
      ctx: providerContext.ctx,
      provider: "exa",
      request: {
        consumer: providerContext.consumer,
        endpoint: "/contents",
        workspaceId: providerContext.workspaceId,
        prospectId: providerContext.prospectId,
        autoPlanRunId: providerContext.autoPlanRunId,
      },
      execute: async () => {
        await acquireExaApiBudget(
          providerContext.ctx,
          providerContext.consumer
        );
        return await exa.getContents(limitedUrls, {
          text: { maxCharacters: SNIPPET_MAX_CHARS },
        });
      },
      estimateUsage: (result) => {
        const billableUnits = result.results?.length ?? 0;
        return {
          billableUnits,
          estimatedCostUsd: billableUnits * EXA_CONTENT_COST_PER_PAGE_USD,
        };
      },
    });

    return (response.results ?? []).map((result) => ({
      url: result.url,
      title: result.title?.trim() || result.url,
      snippet: (result.text ?? "").replace(/\s+/g, " ").trim(),
    }));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Website read failed";
    return limitedUrls.map((url) => ({
      url,
      title: url,
      snippet: "",
      error: errorMessage,
    }));
  }
}

/**
 * Run up to MAX_QUERIES Exa searches in parallel, each returning extracted
 * page text. A failing query degrades to an error entry instead of failing
 * the whole batch.
 */
export async function runDeepResearch(
  queries: string[],
  providerContext: ResearchProviderContext
): Promise<ResearchQueryOutcome[]> {
  const exa = getExaClient();
  const limited = queries
    .map((query) => query.trim())
    .filter(Boolean)
    .slice(0, MAX_QUERIES);

  const outcomes: ResearchQueryOutcome[] = [];
  for (const query of limited) {
    try {
      const response = await trackProviderRequest({
        ctx: providerContext.ctx,
        provider: "exa",
        request: {
          consumer: providerContext.consumer,
          endpoint: "/search",
          workspaceId: providerContext.workspaceId,
          prospectId: providerContext.prospectId,
          autoPlanRunId: providerContext.autoPlanRunId,
        },
        execute: async () => {
          await acquireExaApiBudget(
            providerContext.ctx,
            providerContext.consumer
          );
          return await exa.search(query, {
            type: "auto",
            numResults: RESULTS_PER_QUERY,
            contents: {
              text: { maxCharacters: SNIPPET_MAX_CHARS },
            },
          });
        },
        estimateUsage: (result) => {
          const billableUnits = result.results?.length ?? 0;
          return {
            billableUnits,
            estimatedCostUsd:
              EXA_SEARCH_COST_PER_REQUEST_USD +
              billableUnits * EXA_CONTENT_COST_PER_PAGE_USD,
          };
        },
      });

      const findings: ResearchFinding[] = (response.results ?? []).map(
        (result) => ({
          title: result.title?.trim() || result.url,
          url: result.url,
          publishedDate: result.publishedDate ?? undefined,
          snippet: (result.text ?? "").replace(/\s+/g, " ").trim(),
        })
      );

      outcomes.push({ query, findings });
    } catch (error) {
      outcomes.push({
        query,
        findings: [],
        error: error instanceof Error ? error.message : "Search failed",
      });
      break;
    }
  }
  return outcomes;
}
