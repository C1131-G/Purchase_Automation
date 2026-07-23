/**
 * IC REST path constants — single source for client + unit tests.
 * Mounted under authenticated API as `/api/v1/ic/*`.
 */
export const IC_API_PATHS = {
  health: "/api/v1/ic/health",
  /** Reserved for P6/P8 — not called until notification APIs exist. */
  notifications: "/api/v1/ic/notifications",
  notificationsUnreadCount: "/api/v1/ic/notifications/unread-count",
  /** Reserved for P6/P8. */
  rfqs: "/api/v1/ic/rfqs",
} as const;

export type IcApiPathKey = keyof typeof IC_API_PATHS;
