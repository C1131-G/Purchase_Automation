import { keepPreviousData, queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import type {
  IcNotificationsListParams,
  IcRetriesListParams,
} from "@/features/intercompany/api/intercompany.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

import {
  IC_RFQ_IN_FLIGHT_POLL_MS,
  invalidateIcCaches,
  isIcRfqConvertInFlight,
  isIcRfqConvertTerminal,
} from "./ic-cache-invalidation";
import { intercompanyKeys } from "./intercompany.keys";
import { intercompanyAPI } from "./intercompany.service";

export { intercompanyKeys };

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

/**
 * Unread count for shell badge — short stale so mark-read stays snappy.
 * When count rises (peer company / background job wrote a notification), refresh
 * IC-related document lists/maps so RFQ/PQ/SQ/PO tables show new docs without a full reload.
 */
export function useIcUnreadCount(enabled = true) {
  const queryClient = useQueryClient();
  const previousCountRef = useRef<number | null>(null);

  const query = useQuery({
    enabled,
    queryFn: () => intercompanyAPI.getUnreadCount(),
    queryKey: intercompanyKeys.unreadCount(),
    /** Override app-wide focus-off so the shell badge stays current. */
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    staleTime: 15_000,
  });

  const count = query.data?.data.count;

  useEffect(() => {
    if (typeof count !== "number") {
      return;
    }
    const previous = previousCountRef.current;
    previousCountRef.current = count;
    // First observation only seeds the baseline (no peer refresh on mount).
    if (previous == null || count <= previous) {
      return;
    }
    void invalidateIcCaches(queryClient, ["peerDocuments"]);
  }, [count, queryClient]);

  return query;
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

/**
 * RFQ detail (Phase 2 form + table/hover prefetch).
 * Status-gated poll while convert is in flight (SUBMITTED); stops on terminal statuses.
 * When status leaves in-flight for COMPLETED/CANCELLED, invalidate Flow 1 doc caches once.
 */
export function useIcRfq(rfqId: number, enabled = true) {
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<string | null>(null);

  const query = useQuery({
    ...icRfqQueries.detail(rfqId),
    enabled: enabled && Number.isFinite(rfqId) && rfqId > 0,
    refetchInterval: (current) => {
      const status = current.state.data?.data?.status;
      return isIcRfqConvertInFlight(status) ? IC_RFQ_IN_FLIGHT_POLL_MS : false;
    },
  });

  const status = query.data?.data?.status;

  useEffect(() => {
    if (status == null) {
      return;
    }
    const normalized = String(status).trim().toUpperCase();
    const previous = previousStatusRef.current;
    previousStatusRef.current = normalized;

    if (previous == null) {
      return;
    }
    if (!isIcRfqConvertInFlight(previous) || !isIcRfqConvertTerminal(normalized)) {
      return;
    }
    // Convert finished while user stayed on the form — surface PQ/SQ + map + badge.
    void invalidateIcCaches(
      queryClient,
      ["rfq", "flow1Documents", "relationshipMaps", "notifications", "retries"],
      { rfqId },
    );
  }, [status, queryClient, rfqId]);

  return query;
}
