import type {
  IcNotificationsListParams,
  IcRetriesListParams,
} from "@/features/intercompany/api/intercompany.service";

/** React Query key factory for Intercompany (shared by queries + cache invalidation). */
export const intercompanyKeys = {
  all: ["intercompany"] as const,
  health: () => [...intercompanyKeys.all, "health"] as const,
  revision: () => [...intercompanyKeys.all, "revision"] as const,
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
