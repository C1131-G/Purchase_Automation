/**
 * Warm create-form master lookups (party + warehouses + sales employees).
 * Used by create route loaders and sidebar/login intent prefetch.
 * Does not load product catalogs.
 */
import type { QueryClient } from "@tanstack/react-query";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";

export type CreateMasterParty = "vendors" | "customers";

/** Block until party / warehouses / sales employees are in the React Query cache. */
export const ensureCreateMasterData = async (
  queryClient: QueryClient,
  party: CreateMasterParty = "vendors",
): Promise<void> => {
  // Branch separately so query option types stay concrete (exactOptionalPropertyTypes).
  if (party === "customers") {
    await Promise.all([
      queryClient.ensureQueryData(createSharedQueries.customers()),
      queryClient.ensureQueryData(createSharedQueries.warehouses()),
      queryClient.ensureQueryData(createSharedQueries.salesEmployees()),
      queryClient.ensureQueryData(createSharedQueries.taxCodes()),
    ]);
    return;
  }

  await Promise.all([
    queryClient.ensureQueryData(createSharedQueries.vendors()),
    queryClient.ensureQueryData(createSharedQueries.warehouses()),
    queryClient.ensureQueryData(createSharedQueries.salesEmployees()),
    queryClient.ensureQueryData(createSharedQueries.taxCodes()),
  ]);
};

/** Fire-and-forget warm (hover intent, idle login). Safe if already cached. */
export const prefetchCreateMasterData = (
  queryClient: QueryClient,
  party: CreateMasterParty = "vendors",
): void => {
  if (party === "customers") {
    void queryClient.prefetchQuery(createSharedQueries.customers());
  } else {
    void queryClient.prefetchQuery(createSharedQueries.vendors());
  }
  void queryClient.prefetchQuery(createSharedQueries.warehouses());
  void queryClient.prefetchQuery(createSharedQueries.salesEmployees());
  void queryClient.prefetchQuery(createSharedQueries.taxCodes());
};
