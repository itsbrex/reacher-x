"use node";

/**
 * Deep research core (Layer 3) built on Exa.
 *
 * Runs neural web searches with content extraction so the △ Agent can
 * research prospects and companies before generating or refining plans.
 */

import Exa from "exa-js";

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

/** Read clean page text directly from known URLs already stored on a profile. */
export async function readWebPages(
  urls: string[]
): Promise<WebPageReadOutcome[]> {
  const exa = getExaClient();
  const limitedUrls = [
    ...new Set(urls.map((url) => url.trim()).filter(Boolean)),
  ].slice(0, 2);

  if (limitedUrls.length === 0) {
    return [];
  }

  try {
    const response = await exa.getContents(limitedUrls, {
      text: { maxCharacters: SNIPPET_MAX_CHARS },
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
  queries: string[]
): Promise<ResearchQueryOutcome[]> {
  const exa = getExaClient();
  const limited = queries
    .map((query) => query.trim())
    .filter(Boolean)
    .slice(0, MAX_QUERIES);

  return await Promise.all(
    limited.map(async (query): Promise<ResearchQueryOutcome> => {
      try {
        const response = await exa.searchAndContents(query, {
          type: "auto",
          numResults: RESULTS_PER_QUERY,
          text: { maxCharacters: SNIPPET_MAX_CHARS },
        });

        const findings: ResearchFinding[] = (response.results ?? []).map(
          (result) => ({
            title: result.title?.trim() || result.url,
            url: result.url,
            publishedDate: result.publishedDate ?? undefined,
            snippet: (result.text ?? "").replace(/\s+/g, " ").trim(),
          })
        );

        return { query, findings };
      } catch (error) {
        return {
          query,
          findings: [],
          error: error instanceof Error ? error.message : "Search failed",
        };
      }
    })
  );
}
