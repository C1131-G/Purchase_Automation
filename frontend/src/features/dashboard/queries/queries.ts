import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/shared/api/client";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

import type { OverviewDashboardResponse } from "../utils/overview.types";
import { dashboardKeys } from "./queryKeys";

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
