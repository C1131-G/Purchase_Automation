import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";

import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

import type {
  OverviewArDraftsPageResponse,
  OverviewDashboardResponse,
} from "../utils/overview.types";
import { dashboardKeys } from "./queryKeys";

/** Page size for dashboard AR Invoice Draft infinite list (matches backend default). */
export const AR_INVOICE_DRAFTS_PAGE_SIZE = 40;

export const overviewDashboardQueryOptions = () =>
  queryOptions({
    queryKey: dashboardKeys.overview(),
    queryFn: () => apiClient<OverviewDashboardResponse>("/api/v1/dashboard/overview"),
    staleTime: QUERY_CACHE_POLICY.overview.staleTime,
    gcTime: QUERY_CACHE_POLICY.overview.gcTime,
  });

export function useOverviewDashboard() {
  return useQuery({
    ...overviewDashboardQueryOptions(),
    select: (response) => response.data,
  });
}

export const arInvoiceDraftsInfiniteOptions = () =>
  infiniteQueryOptions({
    queryKey: dashboardKeys.arInvoiceDrafts(),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const qs = toQueryString({
        limit: AR_INVOICE_DRAFTS_PAGE_SIZE,
        offset: pageParam,
      });
      const response = await apiClient<OverviewArDraftsPageResponse>(
        `/api/v1/dashboard/ar-invoice-drafts?${qs}`,
      );
      return response.data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextOffset != null ? lastPage.nextOffset : undefined,
    staleTime: QUERY_CACHE_POLICY.overview.staleTime,
    gcTime: QUERY_CACHE_POLICY.overview.gcTime,
  });

export function useArInvoiceDraftsInfinite() {
  return useInfiniteQuery(arInvoiceDraftsInfiniteOptions());
}
