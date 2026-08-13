import { Link } from "@tanstack/react-router";
import { Bell, RotateCcw } from "lucide-react";

import {
  useIcPendingRetryCount,
  useIcUnreadCount,
} from "@/features/intercompany/api/intercompany.queries";
import { cn } from "@/shared/utils/cn";

const formatStatusCount = (count: number | undefined, isError: boolean): string => {
  if (isError) return "—";
  if (count === undefined) return "…";
  return count > 99 ? "99+" : String(count);
};

const notificationAccessibleName = (count: number | undefined, isError: boolean): string => {
  if (isError) return "Notifications, count unavailable";
  if (count === undefined) return "Notifications, count loading";
  return `Notifications, ${count} unread`;
};

const retryAccessibleName = (count: number | undefined, isError: boolean): string => {
  if (isError) return "Retries, count unavailable";
  if (count === undefined) return "Retries, count loading";
  return `Retries, ${count} pending`;
};

const actionClassName = cn(
  "group inline-flex h-9 min-w-9 items-center justify-center gap-2 rounded-xl border bg-surface px-2.5 text-xs font-semibold shadow-sm",
  "transition-[border-color,background-color,color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
  "active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
);

export function IcDashboardStatusActions() {
  const unreadQuery = useIcUnreadCount(true);
  const retryQuery = useIcPendingRetryCount(true);
  const unreadCount = unreadQuery.data?.data.count;
  const retryCount = retryQuery.data;
  const hasUnread = (unreadCount ?? 0) > 0;
  const hasRetries = (retryCount ?? 0) > 0;

  return (
    <nav aria-label="Intercompany status" className="flex items-center gap-1.5">
      <Link
        to="/intercompany/notifications"
        search={{ isRead: "all", limit: 10, page: 1 }}
        preload="intent"
        aria-label={notificationAccessibleName(unreadCount, unreadQuery.isError)}
        className={cn(
          actionClassName,
          hasUnread
            ? "border-teal-200 text-teal-800 hover:border-teal-300 hover:bg-teal-50"
            : "border-linen-200 text-teal-800 hover:border-teal-200 hover:bg-teal-50/60",
          "focus-visible:outline-teal-500",
        )}
      >
        <Bell className="size-3.5 shrink-0" aria-hidden />
        <span className="hidden xl:inline">Notifications</span>
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-bold tabular-nums",
            hasUnread ? "bg-teal-600 text-surface" : "bg-teal-50 text-teal-700",
          )}
        >
          {formatStatusCount(unreadCount, unreadQuery.isError)}
        </span>
      </Link>

      <Link
        to="/intercompany/retries"
        search={{ limit: 10, page: 1, status: "all" }}
        preload="intent"
        aria-label={retryAccessibleName(retryCount, retryQuery.isError)}
        className={cn(
          actionClassName,
          hasRetries
            ? "border-amber-200 text-amber-800 hover:border-amber-300 hover:bg-amber-50"
            : "border-linen-200 text-amber-800 hover:border-amber-200 hover:bg-amber-50/60",
          "focus-visible:outline-amber-500",
        )}
      >
        <RotateCcw className="size-3.5 shrink-0" aria-hidden />
        <span className="hidden xl:inline">Retries</span>
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-bold tabular-nums",
            hasRetries ? "bg-amber-500 text-ink-900" : "bg-amber-50 text-amber-800",
          )}
        >
          {formatStatusCount(retryCount, retryQuery.isError)}
        </span>
      </Link>
    </nav>
  );
}
