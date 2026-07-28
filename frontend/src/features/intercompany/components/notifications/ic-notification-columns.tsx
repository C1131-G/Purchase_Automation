import { createColumnHelper } from "@tanstack/react-table";
import { Check, Loader2 } from "lucide-react";

import type { IcNotification } from "@/features/intercompany/schemas/intercompany-api.schema";
import { IcNotificationMessage } from "@/features/intercompany/components/notifications/ic-notification-message";
import type { IcNotificationDocLink } from "@/features/intercompany/utils/ic-notification-navigation";
import { TableColumnSort } from "@/features/table-pages/table-shared/components/core/table-column-sort";
import { matchesDateRange } from "@/features/table-pages/table-shared/utils/table-filter-values";
import { cn } from "@/shared/utils/cn";

const columnHelper = createColumnHelper<IcNotification>();

const formatCreatedAt = (value: string | null | undefined): string => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const priorityClassName = (priority: string): string => {
  const normalized = priority.trim().toUpperCase();
  if (normalized === "HIGH" || normalized === "CRITICAL") {
    return "bg-red-50 text-red-800 ring-red-200";
  }
  if (normalized === "LOW") {
    return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  }
  return "bg-sky-50 text-sky-800 ring-sky-200";
};

export interface CreateIcNotificationColumnsOptions {
  markReadPendingId: number | null;
  onMarkRead: (notificationId: number) => void;
  onNavigate?: (notification: IcNotification, link: IcNotificationDocLink) => void;
}

/**
 * Notifications grid order:
 * Created → Message → Status → Priority → Actions
 */
export const createIcNotificationColumns = (options: CreateIcNotificationColumnsOptions) => [
  columnHelper.accessor("createdAt", {
    cell: (info) => (
      <span className="whitespace-nowrap tabular-nums text-zinc-700">
        {formatCreatedAt(info.getValue())}
      </span>
    ),
    enableColumnFilter: true,
    enableSorting: true,
    filterFn: (row, columnId, filterValue) => matchesDateRange(row.getValue(columnId), filterValue),
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Created At" />
    ),
    id: "createdAt",
    meta: { filterType: "date" },
    minSize: 12,
    size: 15,
  }),
  columnHelper.accessor("message", {
    cell: (info) => {
      const notification = info.row.original;
      if (options.onNavigate) {
        return (
          <IcNotificationMessage notification={notification} onNavigate={options.onNavigate} />
        );
      }
      return <IcNotificationMessage notification={notification} />;
    },
    enableColumnFilter: false,
    enableSorting: true,
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Message" />
    ),
    id: "message",
    minSize: 36,
    size: 50,
  }),
  columnHelper.accessor("isRead", {
    cell: (info) => {
      const isRead = info.getValue();
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
            isRead
              ? "bg-zinc-50 text-zinc-500 ring-zinc-200"
              : "bg-blue-50 text-blue-800 ring-blue-200",
          )}
        >
          {isRead ? "Read" : "Unread"}
        </span>
      );
    },
    enableColumnFilter: true,
    enableSorting: true,
    filterFn: (row, _columnId, filterValue) => {
      const raw = String(filterValue ?? "")
        .trim()
        .toLowerCase();
      if (!raw || raw === "all") {
        return true;
      }
      if (raw === "unread" || raw === "false" || raw === "0") {
        return !row.original.isRead;
      }
      if (raw === "read" || raw === "true" || raw === "1") {
        return row.original.isRead;
      }
      return true;
    },
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Status" />
    ),
    id: "isRead",
    meta: {
      filterType: "select",
      // Labels are title case; values stay lowercase for filter logic / URL.
      // Select trigger always shows `label` (e.g. "Read"), not raw value ("read").
      filterOptions: [
        { label: "Unread", value: "unread" },
        { label: "Read", value: "read" },
      ],
    },
    minSize: 8,
    size: 12,
  }),
  columnHelper.accessor("priority", {
    cell: (info) => {
      const value = info.getValue() || "MEDIUM";
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
            priorityClassName(value),
          )}
        >
          {value}
        </span>
      );
    },
    enableColumnFilter: true,
    enableSorting: true,
    filterFn: (row, _columnId, filterValue) => {
      const raw = String(filterValue ?? "")
        .trim()
        .toUpperCase();
      if (!raw || raw === "ALL") {
        return true;
      }
      return (
        String(row.original.priority ?? "MEDIUM")
          .trim()
          .toUpperCase() === raw
      );
    },
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Priority" />
    ),
    id: "priority",
    meta: {
      filterType: "select",
      filterOptions: [
        { label: "Low", value: "LOW" },
        { label: "Medium", value: "MEDIUM" },
        { label: "High", value: "HIGH" },
        { label: "Critical", value: "CRITICAL" },
      ],
    },
    minSize: 8,
    size: 12,
  }),
  columnHelper.display({
    cell: ({ row }) => {
      const { isRead, notificationId } = row.original;
      if (isRead) {
        return (
          // Left content + small right gap so the column edge doesn’t feel cramped.
          <div className="flex w-full items-center justify-start pr-3">
            <span
              className="inline-flex h-6 items-center gap-0.5 text-[10px] font-medium text-zinc-400"
              title="Already read"
              aria-label="Already read"
            >
              <Check className="size-3 stroke-[2.5px]" aria-hidden />
              Done
            </span>
          </div>
        );
      }
      const isPending = options.markReadPendingId === notificationId;
      return (
        <div className="flex w-full items-center justify-start pr-3">
          <button
            type="button"
            className={cn(
              "inline-flex h-6 shrink-0 cursor-pointer items-center gap-0.5 rounded-md border border-zinc-200 bg-white px-1.5 text-[10px] font-semibold text-zinc-700 shadow-none transition-colors",
              "hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
            disabled={isPending}
            aria-label={`Mark notification ${notificationId} as read`}
            title="Mark as read"
            onClick={() => options.onMarkRead(notificationId)}
          >
            {isPending ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              <Check className="size-3 stroke-[2.5px]" aria-hidden />
            )}
            Read
          </button>
        </div>
      );
    },
    enableColumnFilter: false,
    enableHiding: false,
    enableSorting: false,
    // Same header chrome as Created / Message / Status (non-sortable style).
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Read" />
    ),
    id: "actions",
    maxSize: 8,
    minSize: 6,
    size: 7,
  }),
];

export const IC_NOTIFICATION_DEFAULT_COLUMN_ORDER = [
  "createdAt",
  "message",
  "isRead",
  "priority",
  "actions",
] as const;
