import type { Table } from "@tanstack/react-table";
import { CheckCheck, Loader2 } from "lucide-react";

import type { IcNotification } from "@/features/intercompany/schemas/intercompany-api.schema";
import { TableToolbar } from "@/features/table-pages/table-shared/components/core/table-toolbar";
import { cn } from "@/shared/utils/cn";

const IC_NOTIFICATION_BREADCRUMB = {
  href: "/intercompany/notifications",
  page: "Notifications Data Table",
  section: "Intercompany",
} as const;

export interface IcNotificationToolbarProps {
  tableId: string;
  table: Table<IcNotification>;
  onReset: () => void;
  onMarkAllRead: () => void;
  markAllPending: boolean;
  unreadCount: number;
}

/**
 * Same chrome as PQ / RFQ tables: breadcrumb title + search + filter.
 * No Create / View — fixed columns; mark-all-read is an end action.
 */
export function IcNotificationToolbar({
  tableId,
  table,
  onReset,
  onMarkAllRead,
  markAllPending,
  unreadCount,
}: IcNotificationToolbarProps) {
  const markAllDisabled = unreadCount === 0 || markAllPending;

  return (
    <TableToolbar
      tableId={tableId}
      table={table}
      onReset={onReset}
      hideCreate
      hideView
      breadcrumb={IC_NOTIFICATION_BREADCRUMB}
      endActions={
        <button
          type="button"
          className={cn(
            // Match toolbar Create link sizing/shape so Mark all sits cleanly next to Filter.
            "group flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold tracking-normal text-zinc-900 shadow-sm transition-all",
            "hover:bg-zinc-50 hover:text-blue-600 focus:outline-none focus:ring-0 active:scale-[0.98]",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-zinc-900",
          )}
          disabled={markAllDisabled}
          aria-label={
            unreadCount > 0
              ? `Mark all ${unreadCount} notifications as read`
              : "No unread notifications"
          }
          title={unreadCount > 0 ? `Mark all ${unreadCount} as read` : "No unread notifications"}
          onClick={onMarkAllRead}
        >
          {markAllPending ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-zinc-500" aria-hidden />
          ) : (
            <CheckCheck
              className="size-4 shrink-0 text-zinc-500 group-hover:text-blue-600"
              aria-hidden
            />
          )}
          <span className="whitespace-nowrap">Mark all</span>
          {unreadCount > 0 ? (
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-blue-700 ring-1 ring-inset ring-blue-100">
              {unreadCount}
            </span>
          ) : null}
        </button>
      }
    />
  );
}
