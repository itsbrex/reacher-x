"use client";

import { RadioGroup, RadioGroupItem } from "@/shared/ui/components/RadioGroup";
import {
  isWorkspaceUseCaseKey,
  type WorkspaceUseCaseKey,
} from "@/shared/lib/workspaceUseCases";
import { WORKSPACE_USE_CASE_GROUPS } from "@/shared/lib/workspaceUseCaseGroups";
import { UseCaseIllustration } from "./use-case-illustrations/useCaseIllustrationByKey";

interface UseCaseStepProps {
  activeUseCaseKey: WorkspaceUseCaseKey;
  onSelectUseCase: (useCaseKey: WorkspaceUseCaseKey) => void;
}

export function UseCaseStep({
  activeUseCaseKey,
  onSelectUseCase,
}: UseCaseStepProps) {
  return (
    <section className="min-w-0">
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-4 block w-full px-0 text-xl font-semibold">
          Who are you looking for?
        </legend>

        <RadioGroup
          className="flex flex-col gap-0"
          value={activeUseCaseKey}
          onValueChange={(value) => {
            if (isWorkspaceUseCaseKey(value)) {
              onSelectUseCase(value);
            }
          }}
        >
          {WORKSPACE_USE_CASE_GROUPS.map((group, groupIndex) => (
            <div
              key={group.categoryLabel}
              className={groupIndex > 0 ? "mt-4" : undefined}
            >
              <p className="text-muted-foreground mb-2 text-xs">
                {group.categoryLabel}
              </p>
              <div className="flex flex-col gap-2">
                {group.items.map((item) => {
                  const controlId = `use-case-${item.key}`;
                  return (
                    <label
                      key={item.key}
                      htmlFor={controlId}
                      className="flex cursor-pointer items-center gap-3"
                    >
                      <UseCaseIllustration useCaseKey={item.key} />
                      <span className="min-w-0 flex-1">
                        <span className="text-sm font-medium">
                          {item.title}
                        </span>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                          {item.description}
                        </p>
                      </span>
                      <RadioGroupItem
                        id={controlId}
                        value={item.key}
                        className="shrink-0 self-center"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </RadioGroup>
      </fieldset>
    </section>
  );
}
