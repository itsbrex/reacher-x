// features/search/lib/utils.ts
import type { FilterState } from "../types";
import type { FilterFormData } from "./schemas";

export function filterStateToFormData(
  filterState: FilterState
): FilterFormData {
  return {
    verified: filterState.verified ?? false,
    unverified: filterState.unverified ?? false,
    from: filterState.from ?? "",
    to: filterState.to ?? "",
    mention: filterState.mention ?? "",
    list: filterState.list ?? "",
  };
}

// Update this function to handle partial form data
export function formDataToFilterState(
  formData: Partial<FilterFormData>
): FilterState {
  const result: FilterState = {};
  if (formData.verified) result.verified = formData.verified;
  if (formData.unverified) result.unverified = formData.unverified;
  if (formData.from?.trim()) result.from = formData.from.trim();
  if (formData.to?.trim()) result.to = formData.to.trim();
  if (formData.mention?.trim()) result.mention = formData.mention.trim();
  if (formData.list?.trim()) result.list = formData.list.trim();
  return result;
}

// Helper function to ensure we have complete form data
export function ensureCompleteFormData(
  partialData: Partial<FilterFormData>
): FilterFormData {
  return {
    verified: partialData.verified ?? false,
    unverified: partialData.unverified ?? false,
    from: partialData.from ?? "",
    to: partialData.to ?? "",
    mention: partialData.mention ?? "",
    list: partialData.list ?? "",
  };
}
