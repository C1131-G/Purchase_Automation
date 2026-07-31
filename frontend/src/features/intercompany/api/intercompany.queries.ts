import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import type {
  IcNotificationsListParams,
  IcRetriesListParams,
} from "@/features/intercompany/api/intercompany.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

import { intercompanyAPI } from "./intercompany.service";

export const intercompanyKeys = {
  all: ["intercompany"] as const,
  health: () => [...intercompanyKeys.all, "health"] as const,
  notifications: () => [...intercompanyKeys.all, "notifications"] as const,
  notificationList: (params: IcNotificationsListParams = {}) =>
    [...intercompanyKeys.notifications(), "list", params] as const,
  unreadCount: () => [...intercompanyKeys.notifications(), "unread-count"] as const,
  retries: () => [...intercompanyKeys.all, "retries"] as const,
  retryList: (params: IcRetriesListParams = {}) =>
    [...intercompanyKeys.retries(), "list", params] as const,
  pendingRetryCount: () => [...intercompanyKeys.retries(), "pending-count"] as const,
  rfqs: () => [...intercompanyKeys.all, "rfqs"] as const,
  rfqList: () => [...intercompanyKeys.rfqs(), "list"] as const,
  rfqDetail: (rfqId: number) => [...intercompanyKeys.rfqs(), "detail", rfqId] as const,
};

/**
 * Shared RFQ query options — used by hooks, login/sidebar/route prefetch, and table hover.
 * Matches other document tables (queryOptions + tableList cache policy).
 */
export const icRfqQueries = {
  list: () =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => intercompanyAPI.listRfqs(),
      queryKey: intercompanyKeys.rfqList(),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  detail: (rfqId: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.detail.gcTime,
      queryFn: () => intercompanyAPI.getRfq(rfqId),
      queryKey: intercompanyKeys.rfqDetail(rfqId),
      staleTime: QUERY_CACHE_POLICY.detail.staleTime,
    }),
};

/** Optional health query for the shell placeholder page. */
export function useIcHealth(enabled = true) {
  return useQuery({
    enabled,
    queryFn: () => intercompanyAPI.getHealth(),
    queryKey: intercompanyKeys.health(),
    retry: false,
    staleTime: 60_000,
  });
}

/** Session-company notification list (URL filters applied client-side in Phase 3). */
export function useIcNotifications(params: IcNotificationsListParams = {}, enabled = true) {
  return useQuery({
    enabled,
    queryFn: () => intercompanyAPI.listNotifications(params),
    queryKey: intercompanyKeys.notificationList(params),
    staleTime: 15_000,
  });
}

/** Unread count for shell badge — short stale so mark-read stays snappy. */
export function useIcUnreadCount(enabled = true) {
  return useQuery({
    enabled,
    queryFn: () => intercompanyAPI.getUnreadCount(),
    queryKey: intercompanyKeys.unreadCount(),
    /** Override app-wide focus-off so the shell badge stays current. */
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    staleTime: 15_000,
  });
}

/** Session-company retry queue (optional status CSV). */
export function useIcRetries(params: IcRetriesListParams = {}, enabled = true) {
  return useQuery({
    enabled,
    queryFn: () => intercompanyAPI.listRetries(params),
    queryKey: intercompanyKeys.retryList(params),
    staleTime: 15_000,
  });
}

/** Pending retry count for shell badge — WAITING, DEAD, PROCESSING (backend default). */
export function useIcPendingRetryCount(enabled = true) {
  return useQuery({
    enabled,
    queryFn: async () => {
      const response = await intercompanyAPI.listRetries();
      return response.data.length;
    },
    queryKey: intercompanyKeys.pendingRetryCount(),
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    staleTime: 15_000,
  });
}

/** Session-company RFQ list (filter/sort/page client-side on the table). */
export function useIcRfqs(enabled = true) {
  return useQuery({
    ...icRfqQueries.list(),
    enabled,
  });
}

/** RFQ detail (Phase 2 form + table/hover prefetch). */
export function useIcRfq(rfqId: number, enabled = true) {
  return useQuery({
    ...icRfqQueries.detail(rfqId),
    enabled: enabled && Number.isFinite(rfqId) && rfqId > 0,
  });
}
