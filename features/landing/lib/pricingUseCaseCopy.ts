import type { WorkspaceUseCaseKey } from "@/shared/lib/workspaceUseCases";
import { getWorkspaceUseCase } from "@/shared/lib/workspaceUseCases";

const QUALIFIED_PROSPECTS_TEXT = "qualified prospects";

export function resolvePricingFeatureCopy(
  feature: string,
  useCaseKey: WorkspaceUseCaseKey
): string {
  const entityPlural =
    getWorkspaceUseCase(useCaseKey).entityPlural.toLowerCase();

  return feature.replace(QUALIFIED_PROSPECTS_TEXT, `qualified ${entityPlural}`);
}
