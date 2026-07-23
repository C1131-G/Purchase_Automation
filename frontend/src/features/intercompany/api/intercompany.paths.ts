/**
 * IC REST path constants — single source for client + unit tests.
 * Mounted under authenticated API as `/api/v1/ic/*`.
 */
export const IC_API_PATHS = {
  health: "/api/v1/ic/health",
  notifications: "/api/v1/ic/notifications",
  notificationsMarkAllRead: "/api/v1/ic/notifications/mark-all-read",
  notificationsUnreadCount: "/api/v1/ic/notifications/unread-count",
  notificationRead: (id: number | string) => `/api/v1/ic/notifications/${id}/read`,
  retries: "/api/v1/ic/retries",
  retryRun: (id: number | string) => `/api/v1/ic/retries/${id}/run`,
  /** Reserved for P8B RFQ UI. */
  rfqs: "/api/v1/ic/rfqs",
} as const;

export type IcApiPathKey = keyof typeof IC_API_PATHS;
