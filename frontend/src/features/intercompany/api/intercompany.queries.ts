import { useQuery } from "@tanstack/react-query";

import type {
  IcNotificationsListParams,
  IcRetriesListParams,
} from "@/features/intercompany/api/intercompany.service";

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
