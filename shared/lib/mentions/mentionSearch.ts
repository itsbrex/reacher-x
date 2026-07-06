import {
  normalizeMentionEntitySearchResult,
  type MentionEntitySearchResult,
} from "./mentionEntities";

function normalizeSearchText(value: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function buildMentionEntityContentSignature(
  entities?: MentionEntitySearchResult[]
) {
  if (!Array.isArray(entities) || entities.length === 0) {
    return "";
  }

  return entities
    .map((entity) => normalizeMentionEntitySearchResult(entity))
    .filter((value): value is MentionEntitySearchResult => value !== null)
    .map((entity) =>
      [
        entity.id,
        entity.kind,
        entity.label,
        entity.mentionText,
        entity.secondaryLabel,
        entity.handle ?? "",
        entity.postUrl ?? "",
        entity.attachmentUrl ?? "",
      ].join("|")
    )
    .join("||");
}

export function scoreLocalMentionEntityMatch(
  entity: MentionEntitySearchResult,
  query: string
) {
  if (!query) {
    return 1;
  }

  const haystacks = [
    entity.label,
    entity.mentionText,
    entity.secondaryLabel,
    entity.handle,
    entity.postUrl,
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  let bestScore = 0;
  for (const haystack of haystacks) {
    if (haystack === query) {
      bestScore = Math.max(bestScore, 120);
      continue;
    }
    if (haystack.startsWith(query)) {
      bestScore = Math.max(bestScore, 80);
      continue;
    }
    const index = haystack.indexOf(query);
    if (index >= 0) {
      bestScore = Math.max(bestScore, Math.max(24, 60 - index));
    }
  }

  return bestScore;
}

export function getLocalMentionResults(args: {
  query: string | null;
  limit?: number;
  localEntities?: MentionEntitySearchResult[];
}) {
  const normalizedQuery = normalizeSearchText(args.query);
  const normalizedLocalEntities = (args.localEntities ?? [])
    .map(normalizeMentionEntitySearchResult)
    .filter((value): value is MentionEntitySearchResult => value !== null);

  return normalizedLocalEntities
    .map((entity) => ({
      entity,
      score: scoreLocalMentionEntityMatch(entity, normalizedQuery),
    }))
    .filter(({ score }) => normalizedQuery.length === 0 || score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, args.limit ?? 8)
    .map(({ entity }) => entity);
}
