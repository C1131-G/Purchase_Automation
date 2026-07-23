/** Intercompany API client — health, notifications, retries (P8A), RFQs (P8B). */
import type { z } from "zod";

import type {
  icHealthResponseSchema,
  icMarkAllNotificationsReadResponseSchema,
  icMarkNotificationReadResponseSchema,
  icNotificationsListParamsSchema,
  icNotificationsListResponseSchema,
  icRetriesListParamsSchema,
  icRetriesListResponseSchema,
  icRfqDetailResponseSchema,
  icRfqsListResponseSchema,
  icRunRetryResponseSchema,
  icUnreadCountResponseSchema,
} from "@/features/intercompany/schemas/intercompany-api.schema";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";

import { IC_API_PATHS } from "./intercompany.paths";

export type IcHealthResponse = z.infer<typeof icHealthResponseSchema>;
export type IcUnreadCountResponse = z.infer<typeof icUnreadCountResponseSchema>;
export type IcNotificationsListParams = z.infer<typeof icNotificationsListParamsSchema>;
export type IcNotificationsListResponse = z.infer<typeof icNotificationsListResponseSchema>;
export type IcMarkNotificationReadResponse = z.infer<typeof icMarkNotificationReadResponseSchema>;
export type IcMarkAllNotificationsReadResponse = z.infer<
  typeof icMarkAllNotificationsReadResponseSchema
>;
export type IcRetriesListParams = z.infer<typeof icRetriesListParamsSchema>;
export type IcRetriesListResponse = z.infer<typeof icRetriesListResponseSchema>;
export type IcRunRetryResponse = z.infer<typeof icRunRetryResponseSchema>;
export type IcRfqsListResponse = z.infer<typeof icRfqsListResponseSchema>;
export type IcRfqDetailResponse = z.infer<typeof icRfqDetailResponseSchema>;

export const intercompanyAPI = {
  /**
   * Module liveness probe.
   * `GET /api/v1/ic/health`
   */
  getHealth: () => apiClient<IcHealthResponse>(IC_API_PATHS.health),

  /**
   * Session-company notifications.
   * `GET /api/v1/ic/notifications?unreadOnly=`
   */
  listNotifications: (params: IcNotificationsListParams = {}) => {
    const query = toQueryString({
      unreadOnly: params.unreadOnly === true ? "true" : undefined,
    });
    const path = query ? `${IC_API_PATHS.notifications}?${query}` : IC_API_PATHS.notifications;
    return apiClient<IcNotificationsListResponse>(path);
  },

  /**
   * Unread notification count for shell badge.
   * `GET /api/v1/ic/notifications/unread-count`
   */
  getUnreadCount: () => apiClient<IcUnreadCountResponse>(IC_API_PATHS.notificationsUnreadCount),

  /**
   * Mark one notification read (company-scoped).
   * `PATCH /api/v1/ic/notifications/:id/read`
   */
  markNotificationRead: (notificationId: number) =>
    apiClient<IcMarkNotificationReadResponse>(IC_API_PATHS.notificationRead(notificationId), {
      method: "PATCH",
    }),

  /**
   * Mark all unread notifications for the session company.
   * `POST /api/v1/ic/notifications/mark-all-read`
   */
  markAllNotificationsRead: () =>
    apiClient<IcMarkAllNotificationsReadResponse>(IC_API_PATHS.notificationsMarkAllRead, {
      method: "POST",
    }),

  /**
   * Retry queue for the session company.
   * `GET /api/v1/ic/retries?status=`
   */
  listRetries: (params: IcRetriesListParams = {}) => {
    const query = toQueryString({ status: params.status });
    const path = query ? `${IC_API_PATHS.retries}?${query}` : IC_API_PATHS.retries;
    return apiClient<IcRetriesListResponse>(path);
  },

  /**
   * Force-run one retry (WAITING or DEAD → claim → execute).
   * `POST /api/v1/ic/retries/:id/run`
   */
  runRetry: (retryId: number) =>
    apiClient<IcRunRetryResponse>(IC_API_PATHS.retryRun(retryId), {
      method: "POST",
    }),

  /**
   * Session-company RFQ headers (source or target).
   * `GET /api/v1/ic/rfqs`
   */
  listRfqs: () => apiClient<IcRfqsListResponse>(IC_API_PATHS.rfqs),

  /**
   * RFQ detail with lines.
   * `GET /api/v1/ic/rfqs/:id`
   */
  getRfq: (rfqId: number) => apiClient<IcRfqDetailResponse>(IC_API_PATHS.rfqById(rfqId)),
};

/** Named export for plan T4.3 / docs. */
export const getIcHealth = (): Promise<IcHealthResponse> => intercompanyAPI.getHealth();
