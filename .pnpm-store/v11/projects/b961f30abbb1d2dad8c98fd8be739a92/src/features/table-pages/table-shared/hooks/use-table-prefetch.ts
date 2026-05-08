import type { FetchQueryOptions, QueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { runSmartPrefetch } from "@/features/table-pages/table-shared/hooks/prefetch-orchestrator";

interface UseTablePrefetchProps<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[],
> {
  queryClient: QueryClient;
  hasData: boolean;
  pagination: {
    pageIndex: number;
    pageSize: number;
  };
  maxPageIndex: number;
  // A factory function that returns the queryOptions for a given page/limit structure.
  // Using generic FetchQueryOptions here allows preserving the specific QueryKey type
  // that queryOptions() infers, preventing strict StaleTime function type mismatches.
  getQueryOptions: (params: {
    page: number;
    limit: number;
  }) => FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>;
}

/**
 * Aggressive Background Prefetching for TanStack Tables
 *
 * Silently loads the next predicted page and next predicted limit size
 * into the React Query cache while the user is looking at the current page.
 */
export function useTablePrefetch<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[],
>({
  queryClient,
  hasData,
  pagination,
  maxPageIndex,
  getQueryOptions,
}: UseTablePrefetchProps<TQueryFnData, TError, TData, TQueryKey>) {
  const connection = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    }
  ).connection as { effectiveType?: string; saveData?: boolean } | undefined;
  const isSlowNetwork =
    connection?.saveData ||
    connection?.effectiveType === "2g" ||
    connection?.effectiveType === "slow-2g";
  const isDocumentVisible =
    typeof document === "undefined" ? true : document.visibilityState === "visible";
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine !== false;
  const prefetchMode =
    import.meta.env.VITE_TABLE_PREFETCH_MODE ??
    (import.meta.env.PROD ? "conservative" : "aggressive");
  const prefetchDisabled = prefetchMode === "off";
  const enableAggressivePrefetch =
    prefetchMode === "aggressive" &&
    !prefetchDisabled &&
    !isSlowNetwork &&
    isDocumentVisible &&
    isOnline;
  const enablePrefetch = !prefetchDisabled && !isSlowNetwork && isDocumentVisible && isOnline;

  const prefetchPage = useCallback(
    (pageIndex: number, pageSize: number) => {
      if (!enablePrefetch) {
        return;
      }
      void runSmartPrefetch(queryClient, getQueryOptions({ limit: pageSize, page: pageIndex + 1 }));
    },
    [queryClient, getQueryOptions, enablePrefetch],
  );

  useEffect(() => {
    if (!hasData || !enablePrefetch) {
      return;
    }

    // Optional aggressive mode: prefetch page-size switch candidates.
    if (enableAggressivePrefetch && pagination.pageSize === 10) {
      prefetchPage(0, 20);
    }

    // Next Page Prefetching: User is on Page X? Prefetch Page X+1
    if (pagination.pageIndex < maxPageIndex) {
      prefetchPage(pagination.pageIndex + 1, pagination.pageSize);
    }
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    maxPageIndex,
    hasData,
    prefetchPage,
    enableAggressivePrefetch,
    enablePrefetch,
  ]);

  return { prefetchPage };
}
