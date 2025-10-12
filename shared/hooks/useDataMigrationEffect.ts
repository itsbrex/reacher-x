import { useEffect, useRef } from "react";
import { logger } from "@/shared/lib/logger";
import { useConvexAuth } from "convex/react";
import { useDataMigration } from "./useDataMigration";
import { useAuth } from "./useAuth";

/**
 * Hook that automatically migrates localStorage data to Convex when a user first authenticates
 *
 * This hook should be used at the app level to ensure data migration happens
 * automatically when users sign up or sign in for the first time.
 *
 * Usage:
 * ```tsx
 * function App() {
 *   useDataMigrationEffect();
 *   // ... rest of app
 * }
 * ```
 */
export function useDataMigrationEffect() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { isAuthenticated: unifiedAuth, isLoading: unifiedLoading } = useAuth();
  const { migrateData, hasDataToMigrate, isMigrating } = useDataMigration();

  // Track if we've already attempted migration for this session
  const hasAttemptedMigration = useRef(false);

  useEffect(() => {
    // Only run migration if:
    // 1. User is authenticated
    // 2. Not currently loading
    // 3. Not already migrating
    // 4. Haven't attempted migration yet
    // 5. There's actually data to migrate
    // Additionally ensure unified auth (which verifies Convex user record exists)
    if (
      isAuthenticated &&
      !isLoading &&
      unifiedAuth &&
      !unifiedLoading &&
      !isMigrating &&
      !hasAttemptedMigration.current &&
      hasDataToMigrate()
    ) {
      hasAttemptedMigration.current = true;

      migrateData()
        .then((result) => {
          if (result.success) {
            logger.info(
              "✅ Data migration completed successfully:",
              result.migratedData
            );
          } else {
            logger.warn("⚠️ Data migration failed:", result.errors);
          }
        })
        .catch((error) => {
          logger.error("❌ Data migration error:", error);
        });
    }

    // Reset migration attempt flag when user logs out
    if (!isAuthenticated) {
      hasAttemptedMigration.current = false;
    }
  }, [
    isAuthenticated,
    isLoading,
    unifiedAuth,
    unifiedLoading,
    isMigrating,
    migrateData,
    hasDataToMigrate,
  ]);

  return {
    isMigrating,
  };
}
