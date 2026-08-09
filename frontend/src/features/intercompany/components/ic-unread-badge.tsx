import { Bell, RotateCcw } from "lucide-react";

import {
  useIcPendingRetryCount,
  useIcUnreadCount,
} from "@/features/intercompany/api/intercompany.queries";
import { cn } from "@/shared/utils/cn";

/** Cap badge digits for dense chrome; API still returns the raw count. */
function formatCountBadge(count: number): string {
  if (count > 99) {
    return "99+";
  }
  return String(count);
}

/**
 * Compact unread indicator for Intercompany sidebar.
 * Bell + count from TanStack Query only (never Zustand).
 * Renders nothing when count is 0.
 */
export function IcUnreadCountPill({ className }: { className?: string }) {
  const unreadQuery = useIcUnreadCount(true);
  const count = unreadQuery.data?.data.count ?? 0;
  if (count <= 0) {
    return null;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-bold leading-none text-surface tabular-nums shadow-sm ring-1 ring-teal-600",
        className,
      )}
      aria-label={`${count} unread notifications`}
    >
      <Bell className="size-3 shrink-0" aria-hidden />
      <span>{formatCountBadge(count)}</span>
    </span>
  );
}

/**
 * Tiny count dot for Intercompany section icon (icon-collapsed sidebar).
 * Renders nothing when count is 0.
 */
export function IcUnreadIconBadge({ className }: { className?: string }) {
  const unreadQuery = useIcUnreadCount(true);
  const count = unreadQuery.data?.data.count ?? 0;
  if (count <= 0) {
    return null;
  }
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 text-[10px] font-bold leading-none text-surface tabular-nums shadow-md ring-2 ring-surface isolate",
        className,
      )}
      aria-label={`${count} unread notifications`}
    >
      {formatCountBadge(count)}
    </span>
  );
}

/**
 * Compact pending-retry indicator for Intercompany sidebar.
 * Renders nothing when count is 0.
 */
export function IcRetryCountPill({ className }: { className?: string }) {
  const retryQuery = useIcPendingRetryCount(true);
  const count = retryQuery.data ?? 0;
  if (count <= 0) {
    return null;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold leading-none text-surface tabular-nums shadow-sm ring-1 ring-amber-500",
        className,
      )}
      aria-label={`${count} pending ${count === 1 ? "retry" : "retries"}`}
    >
      <RotateCcw className="size-3 shrink-0" aria-hidden />
      <span>{formatCountBadge(count)}</span>
    </span>
  );
}

/**
 * Section-header badges for expanded Intercompany nav (notifications + retries).
 */
export function IcIntercompanySectionBadges({ className }: { className?: string }) {
  const unreadQuery = useIcUnreadCount(true);
  const retryQuery = useIcPendingRetryCount(true);
  const unreadCount = unreadQuery.data?.data.count ?? 0;
  const retryCount = retryQuery.data ?? 0;

  if (unreadCount <= 0 && retryCount <= 0) {
    return null;
  }

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {unreadCount > 0 ? <IcUnreadCountPill /> : null}
      {retryCount > 0 ? <IcRetryCountPill /> : null}
    </span>
  );
}
