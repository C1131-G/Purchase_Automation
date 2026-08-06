/**
 * Central React Query invalidation map for Intercompany Flow 1 & 2.
 *
 * Goals:
 * - One place to list which caches a mutation / peer event should touch
 * - Default refetchType "active" so only mounted observers hit the API (fast + safe)
 * - No optimistic IC documents — server is source of truth after invalidate
 */
import type { QueryClient } from "@tanstack/react-query";

import { relationshipMapKeys } from "@/features/create-shared/api/relationship-map.queries";
import { purchaseOrderKeys } from "@/features/table-pages/purchase-orders/api/purchase-order.queries";
import { purchaseQuotationKeys } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";
import { salesQuotationKeys } from "@/features/table-pages/sales-quotations/api/sales-quotation.queries";

import { intercompanyKeys } from "./intercompany.keys";

/** RFQ statuses where PQ+SQ convert may still be running server-side. */
export const IC_RFQ_IN_FLIGHT_STATUSES = new Set(["SUBMITTED"]);

/** RFQ statuses that stop convert polling. */
export const IC_RFQ_TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED"]);

/** Poll interval while RFQ convert is in flight (status-gated). */
export const IC_RFQ_IN_FLIGHT_POLL_MS = 3_000;

export type IcCacheScope =
  | "notifications"
  | "retries"
  | "rfq"
  /** Buyer PQ + seller SQ lists/details after Flow 1 convert. */
  | "flow1Documents"
  /** Buyer PO chain after Flow 2. */
  | "flow2Documents"
  | "relationshipMaps"
  /**
   * Doc families IC can surface in this company session (notification-driven).
   * Does not include notifications (caller already has a fresh badge signal).
   */
  | "peerDocuments";

export type InvalidateIcCachesOptions = {
  rfqId?: number;
  /** Default "active" — only refetch mounted queries. */
  refetchType?: "active" | "all" | "none";
};

const runInvalidate = (
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  refetchType: "active" | "all" | "none",
): Promise<void> => queryClient.invalidateQueries({ queryKey, refetchType });

/**
 * Invalidate IC-related React Query caches by named scope.
 * Safe to call with overlapping scopes — work is deduped by key family.
 */
export function invalidateIcCaches(
  queryClient: QueryClient,
  scopes: readonly IcCacheScope[],
  options: InvalidateIcCachesOptions = {},
): Promise<void> {
  const refetchType = options.refetchType ?? "active";
  const unique = new Set(scopes);
  const tasks: Array<Promise<unknown>> = [];

  const wantsPeer = unique.has("peerDocuments");
  const wantsFlow1 = unique.has("flow1Documents") || wantsPeer;
  const wantsFlow2 = unique.has("flow2Documents") || wantsPeer;
  const wantsRfq = unique.has("rfq") || wantsPeer;
  const wantsMaps = unique.has("relationshipMaps") || wantsPeer || wantsFlow1 || wantsFlow2;

  if (unique.has("notifications")) {
    tasks.push(runInvalidate(queryClient, intercompanyKeys.notifications(), refetchType));
    tasks.push(runInvalidate(queryClient, intercompanyKeys.unreadCount(), refetchType));
  }

  if (unique.has("retries")) {
    tasks.push(runInvalidate(queryClient, intercompanyKeys.retries(), refetchType));
    tasks.push(runInvalidate(queryClient, intercompanyKeys.pendingRetryCount(), refetchType));
  }

  if (wantsRfq) {
    if (options.rfqId != null) {
      tasks.push(runInvalidate(queryClient, intercompanyKeys.rfqList(), refetchType));
      tasks.push(
        runInvalidate(queryClient, intercompanyKeys.rfqDetail(options.rfqId), refetchType),
      );
    } else {
      tasks.push(runInvalidate(queryClient, intercompanyKeys.rfqs(), refetchType));
    }
  }

  if (wantsFlow1) {
    tasks.push(runInvalidate(queryClient, purchaseQuotationKeys.all, refetchType));
    tasks.push(runInvalidate(queryClient, salesQuotationKeys.all, refetchType));
  }

  if (wantsFlow2) {
    tasks.push(runInvalidate(queryClient, purchaseOrderKeys.all, refetchType));
  }

  if (wantsMaps) {
    tasks.push(runInvalidate(queryClient, relationshipMapKeys.all, refetchType));
  }

  return Promise.all(tasks).then(() => undefined);
}

/** True when RFQ status means convert may still be writing PQ/SQ. */
export function isIcRfqConvertInFlight(status: string | null | undefined): boolean {
  return IC_RFQ_IN_FLIGHT_STATUSES.has(
    String(status ?? "")
      .trim()
      .toUpperCase(),
  );
}

/** True when RFQ convert polling should stop. */
export function isIcRfqConvertTerminal(status: string | null | undefined): boolean {
  return IC_RFQ_TERMINAL_STATUSES.has(
    String(status ?? "")
      .trim()
      .toUpperCase(),
  );
}
