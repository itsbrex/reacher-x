import assert from "node:assert/strict";
import test from "node:test";
import type { Doc } from "../convex/_generated/dataModel";
import {
  collectAgentThreadTargetCandidates,
  MAX_AGENT_THREAD_TARGETS,
} from "../convex/lib/agentThreadTargetSelectionHelpers";

type TaggedEntity = Doc<"agentMessageContexts">["taggedEntities"][number];

function createTaggedEntity(
  overrides: Partial<TaggedEntity> & Pick<TaggedEntity, "entityId" | "kind">
): TaggedEntity {
  return {
    ...overrides,
    id: `${overrides.kind}:${overrides.entityId}`,
    entityId: overrides.entityId,
    kind: overrides.kind,
    label: overrides.label ?? overrides.entityId,
    mentionText: overrides.mentionText ?? overrides.entityId,
    secondaryLabel: overrides.secondaryLabel ?? "",
    verified: overrides.verified ?? true,
  };
}

test("thread target candidates preserve exact explicit targets and dedupe them", () => {
  const targets = collectAgentThreadTargetCandidates({
    workspaceId: "workspace_1",
    taggedEntities: [
      createTaggedEntity({
        kind: "prospect",
        entityId: "prospect_1",
        prospectId: "prospect_1",
        workspaceId: "workspace_1",
        label: "Prospect One",
        handle: "prospectOne",
      }),
      createTaggedEntity({
        kind: "post",
        entityId: "post_1",
        prospectId: "prospect_1",
        workspaceId: "workspace_1",
        label: "Post from Prospect One",
      }),
      createTaggedEntity({
        kind: "plan",
        entityId: "plan_2",
        prospectId: "prospect_2",
        workspaceId: "workspace_1",
        label: "Plan for Prospect Two",
      }),
      createTaggedEntity({
        kind: "prospect",
        entityId: "prospect_other",
        prospectId: "prospect_other",
        workspaceId: "workspace_2",
        label: "Other Workspace",
      }),
    ],
  });

  assert.deepEqual(targets, [
    {
      prospectId: "prospect_1",
      label: "Prospect One",
      handle: "prospectOne",
    },
    {
      prospectId: "prospect_2",
      label: "Plan for Prospect Two",
    },
  ]);
});

test("thread target candidates enforce the tagged batch boundary", () => {
  const taggedEntities = Array.from(
    { length: MAX_AGENT_THREAD_TARGETS + 1 },
    (_, index) =>
      createTaggedEntity({
        kind: "prospect",
        entityId: `prospect_${index}`,
        prospectId: `prospect_${index}`,
        workspaceId: "workspace_1",
      })
  );

  assert.throws(
    () =>
      collectAgentThreadTargetCandidates({
        workspaceId: "workspace_1",
        taggedEntities,
      }),
    /tag up to 50 prospects at once/
  );
});
