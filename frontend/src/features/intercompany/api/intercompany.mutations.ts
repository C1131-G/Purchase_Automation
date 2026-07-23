import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { IcUpdateRfqBody } from "./intercompany.service";
import { intercompanyKeys } from "./intercompany.queries";
import { intercompanyAPI } from "./intercompany.service";

const invalidateNotificationCaches = (queryClient: ReturnType<typeof useQueryClient>) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: intercompanyKeys.notifications() }),
    queryClient.invalidateQueries({ queryKey: intercompanyKeys.unreadCount() }),
  ]);

const invalidateRetryCaches = (queryClient: ReturnType<typeof useQueryClient>) =>
  queryClient.invalidateQueries({ queryKey: intercompanyKeys.retries() });

const invalidateRfqCaches = (queryClient: ReturnType<typeof useQueryClient>, rfqId?: number) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: intercompanyKeys.rfqList() }),
    rfqId != null
      ? queryClient.invalidateQueries({ queryKey: intercompanyKeys.rfqDetail(rfqId) })
      : queryClient.invalidateQueries({ queryKey: intercompanyKeys.rfqs() }),
    invalidateNotificationCaches(queryClient),
  ]);

/** PATCH one notification read → refresh list + badge. */
export function useMarkIcNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) => intercompanyAPI.markNotificationRead(notificationId),
    onSuccess: () => {
      void invalidateNotificationCaches(queryClient);
    },
  });
}

/** POST mark-all-read → refresh list + badge. */
export function useMarkAllIcNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => intercompanyAPI.markAllNotificationsRead(),
    onSuccess: () => {
      void invalidateNotificationCaches(queryClient);
    },
  });
}

/** POST retries/:id/run → refresh retry list (and notifications if a job emits one). */
export function useRunIcRetry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (retryId: number) => intercompanyAPI.runRetry(retryId),
    onSuccess: () => {
      void Promise.all([
        invalidateRetryCaches(queryClient),
        invalidateNotificationCaches(queryClient),
      ]);
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
      void invalidateRfqCaches(queryClient, variables.rfqId);
    },
  });
}

/** POST /rfqs/:id/submit — seller submits DRAFT RFQ. */
export function useSubmitIcRfq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rfqId: number) => intercompanyAPI.submitRfq(rfqId),
    onSuccess: (_data, rfqId) => {
      void invalidateRfqCaches(queryClient, rfqId);
    },
  });
}

/** POST /rfqs/:id/convert — buyer converts SUBMITTED RFQ. */
export function useConvertIcRfq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rfqId: number) => intercompanyAPI.convertRfq(rfqId),
    onSuccess: (_data, rfqId) => {
      void invalidateRfqCaches(queryClient, rfqId);
    },
  });
}
