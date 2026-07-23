import { useMutation, useQueryClient } from "@tanstack/react-query";

import { intercompanyKeys } from "./intercompany.queries";
import { intercompanyAPI } from "./intercompany.service";

const invalidateNotificationCaches = (queryClient: ReturnType<typeof useQueryClient>) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: intercompanyKeys.notifications() }),
    queryClient.invalidateQueries({ queryKey: intercompanyKeys.unreadCount() }),
  ]);

const invalidateRetryCaches = (queryClient: ReturnType<typeof useQueryClient>) =>
  queryClient.invalidateQueries({ queryKey: intercompanyKeys.retries() });

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
