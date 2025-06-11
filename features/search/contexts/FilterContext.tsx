// features/search/contexts/FilterContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useRef,
} from "react";

import type { FilterState } from "../types";

interface FilterContextType {
  isFilterMode: boolean;
  filterState: FilterState;
  openFilter: () => void;
  closeFilter: () => void;
  updateFilters: (filters: FilterState) => void;
  applyFilters: () => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [isFilterMode, setIsFilterMode] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({});

  // Use ref to access current filterState in callbacks without adding it to dependencies
  const filterStateRef = useRef<FilterState>({});
  filterStateRef.current = filterState;

  const openFilter = useCallback(() => {
    setIsFilterMode(true);
  }, []);

  const closeFilter = useCallback(() => {
    setIsFilterMode(false);
  }, []);

  const updateFilters = useCallback((filters: FilterState) => {
    // Deep comparison to prevent unnecessary state updates
    const currentFilters = filterStateRef.current;
    if (JSON.stringify(currentFilters) !== JSON.stringify(filters)) {
      setFilterState(filters);
    }
  }, []);

  // Fix: Remove filterState from dependencies to prevent recreating the callback
  const applyFilters = useCallback(() => {
    setIsFilterMode(false);
    // Apply filters logic here - use ref to get current state
    console.log("Applying filters:", filterStateRef.current);

    // TODO: Add your actual filter application logic here
    // Example: trigger search with filters, update URL params, etc.
  }, []);

  const resetFilters = useCallback(() => {
    setFilterState({});
  }, []);

  const contextValue = useCallback(
    () => ({
      isFilterMode,
      filterState,
      openFilter,
      closeFilter,
      updateFilters,
      applyFilters,
      resetFilters,
    }),
    [
      isFilterMode,
      filterState,
      openFilter,
      closeFilter,
      updateFilters,
      applyFilters,
      resetFilters,
    ]
  );

  return (
    <FilterContext.Provider value={contextValue()}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilter must be used within a FilterProvider");
  }
  return context;
}
