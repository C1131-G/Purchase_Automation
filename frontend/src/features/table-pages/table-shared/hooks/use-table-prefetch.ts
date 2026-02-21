import { type FetchQueryOptions, type QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'

interface UseTablePrefetchProps<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[],
> {
  queryClient: QueryClient
  hasData: boolean
  pagination: {
    pageIndex: number
    pageSize: number
  }
  maxPageIndex: number
  // A factory function that returns the queryOptions for a given page/limit structure.
  // Using generic FetchQueryOptions here allows preserving the specific QueryKey type
  // that queryOptions() infers, preventing strict StaleTime function type mismatches.
  getQueryOptions: (params: {
    page: number
    limit: number
  }) => FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>
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
  const prefetchPage = useCallback(
    (pageIndex: number, pageSize: number) => {
      queryClient
        .prefetchQuery(getQueryOptions({ page: pageIndex + 1, limit: pageSize }))
        .catch(() => {})
    },
    [queryClient, getQueryOptions],
  )

  useEffect(() => {
    if (!hasData) return

    // Limit Prefetching: User has 10 rows? Prefetch 20 in the background just in case they switch
    if (pagination.pageSize === 10) {
      prefetchPage(0, 20)
    }

    // Next Page Prefetching: User is on Page X? Prefetch Page X+1
    if (pagination.pageIndex < maxPageIndex) {
      prefetchPage(pagination.pageIndex + 1, pagination.pageSize)
    }
  }, [pagination.pageIndex, pagination.pageSize, maxPageIndex, hasData, prefetchPage])

  return { prefetchPage }
}
