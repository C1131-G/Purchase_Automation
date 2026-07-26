import type { Table } from "@tanstack/react-table";
import { CheckCheck } from "lucide-react";

import { Button } from "@/components/button";
import type { IcNotification } from "@/features/intercompany/schemas/intercompany-api.schema";
import { TableToolbar } from "@/features/table-pages/table-shared/components/core/table-toolbar";

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
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-11 gap-2 normal-case tracking-normal"
          disabled={markAllDisabled}
          isLoading={markAllPending}
          loadingText="Marking…"
          aria-label={
            unreadCount > 0
              ? `Mark all ${unreadCount} notifications as read`
              : "No unread notifications"
          }
          onClick={onMarkAllRead}
        >
          <CheckCheck className="size-4" aria-hidden />
          Mark all read
          {unreadCount > 0 ? (
            <span className="tabular-nums text-zinc-500">({unreadCount})</span>
          ) : null}
        </Button>
      }
    />
  );
}
