import type { MentionEntitySearchResult } from "@/shared/lib/mentions/mentionEntities";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildAgentMentionReplacementText(
  entity: MentionEntitySearchResult
) {
  if (entity.kind === "attachment") {
    return null;
  }

  const visibleText = entity.mentionText.trim();
  return visibleText ? `@${visibleText} ` : null;
}

export function filterSelectedMentionEntitiesByInput(args: {
  input: string;
  entities: MentionEntitySearchResult[];
}) {
  if (!args.input.trim()) {
    return [];
  }

  return args.entities.filter((entity) => {
    const visibleText = entity.mentionText.trim();
    if (!visibleText) {
      return false;
    }

    const mentionPattern = new RegExp(
      `(^|[\\s(])@${escapeRegExp(visibleText)}(?=$|[\\s),.!?:;\\]])`
    );

    return mentionPattern.test(args.input);
  });
}
