import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { IcUpdateRfqBody } from "./intercompany.service";
import { invalidateIcCaches } from "./ic-cache-invalidation";
import { intercompanyAPI } from "./intercompany.service";

/** PATCH one notification read → refresh list + badge. */
export function useMarkIcNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) => intercompanyAPI.markNotificationRead(notificationId),
    onSuccess: () => {
      void invalidateIcCaches(queryClient, ["notifications"]);
    },
  });
}

/** POST mark-all-read → refresh list + badge. */
export function useMarkAllIcNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => intercompanyAPI.markAllNotificationsRead(),
    onSuccess: () => {
      void invalidateIcCaches(queryClient, ["notifications"]);
    },
  });
}

/** POST retries/:id/run → refresh retry queue + peer docs if a job finished a flow step. */
export function useRunIcRetry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (retryId: number) => intercompanyAPI.runRetry(retryId),
    onSuccess: () => {
      void invalidateIcCaches(queryClient, ["retries", "notifications", "peerDocuments"]);
    },
  });
}

/** PUT /rfqs/:id — seller saves unit price / delivery / discount. */
export function useUpdateIcRfq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, rfqId }: { rfqId: number; body: IcUpdateRfqBody }) =>
      intercompanyAPI.updateRfq(rfqId, body),
    onSuccess: (_data, variables) => {
      void invalidateIcCaches(queryClient, ["rfq", "flow1Documents", "relationshipMaps"], {
        rfqId: variables.rfqId,
      });
    },
  });
}

/**
 * POST /rfqs/:id/submit — seller submits DRAFT RFQ (optional lines in same request).
 * Server may flip to COMPLETED immediately or leave SUBMITTED while PQ+SQ convert in background.
 */
export function useSubmitIcRfq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, rfqId }: { rfqId: number; body?: IcUpdateRfqBody }) =>
      intercompanyAPI.submitRfq(rfqId, body),
    onSuccess: (data, variables) => {
      const status = String(data.data?.status ?? "")
        .trim()
        .toUpperCase();
      // COMPLETED = convert finished same request; SUBMITTED = poll will finish the rest.
      const scopes =
        status === "COMPLETED"
          ? (["rfq", "flow1Documents", "relationshipMaps", "notifications", "retries"] as const)
          : (["rfq", "notifications", "retries"] as const);
      void invalidateIcCaches(queryClient, scopes, { rfqId: variables.rfqId });
    },
  });
}

/**
 * POST /rfqs/:id/convert — buyer/seller converts SUBMITTED RFQ → updated PQ + seller SQ.
 * Always touch Flow 1 document families; retry queue if convert queued.
 */
export function useConvertIcRfq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rfqId: number) => intercompanyAPI.convertRfq(rfqId),
    onSuccess: (_data, rfqId) => {
      void invalidateIcCaches(
        queryClient,
        ["rfq", "flow1Documents", "relationshipMaps", "notifications", "retries"],
        { rfqId },
      );
    },
  });
}
