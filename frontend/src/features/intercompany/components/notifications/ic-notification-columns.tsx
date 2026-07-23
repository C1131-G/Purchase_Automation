import { createColumnHelper } from "@tanstack/react-table";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import type { IcNotification } from "@/features/intercompany/schemas/intercompany-api.schema";
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
}

export const createIcNotificationColumns = (options: CreateIcNotificationColumnsOptions) => [
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
      filterOptions: [
        { label: "All", value: "all" },
        { label: "Unread", value: "unread" },
        { label: "Read", value: "read" },
      ],
    },
    minSize: 10,
    size: 12,
  }),
  columnHelper.accessor("title", {
    cell: (info) => {
      const value = info.getValue();
      const unread = !info.row.original.isRead;
      return (
        <Tooltip content={value} className="block w-full max-w-full truncate">
          <span
            className={cn(unread ? "font-semibold text-zinc-950" : "font-medium text-zinc-700")}
          >
            {value}
          </span>
        </Tooltip>
      );
    },
    enableSorting: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Title" />
    ),
    id: "title",
    meta: { filterType: "text" },
    minSize: 20,
    size: 24,
  }),
  columnHelper.accessor("documentType", {
    cell: (info) => info.getValue() || "—",
    enableSorting: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc type" />
    ),
    id: "documentType",
    meta: { filterType: "text" },
    minSize: 10,
    size: 12,
  }),
  columnHelper.accessor("documentId", {
    cell: (info) => {
      const value = info.getValue();
      return value ? <span className="font-mono text-xs text-zinc-800">{value}</span> : "—";
    },
    enableSorting: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc ID" />
    ),
    id: "documentId",
    meta: { filterType: "text" },
    minSize: 10,
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
    enableSorting: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Priority" />
    ),
    id: "priority",
    meta: { filterType: "text" },
    minSize: 10,
    size: 10,
  }),
  columnHelper.accessor("message", {
    cell: (info) => {
      const value = info.getValue();
      if (!value) {
        return "—";
      }
      return (
        <Tooltip content={value} className="block w-full max-w-full truncate text-zinc-600">
          {value}
        </Tooltip>
      );
    },
    enableSorting: false,
    filterFn: "includesString",
    header: () => <span>Message</span>,
    id: "message",
    meta: { filterType: "text" },
    minSize: 18,
    size: 20,
  }),
  columnHelper.accessor("createdAt", {
    cell: (info) => formatCreatedAt(info.getValue()),
    enableSorting: true,
    filterFn: (row, columnId, filterValue) => matchesDateRange(row.getValue(columnId), filterValue),
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Created" />
    ),
    id: "createdAt",
    meta: { filterType: "date" },
    minSize: 12,
    size: 14,
  }),
  columnHelper.display({
    cell: ({ row }) => {
      const { isRead, notificationId } = row.original;
      if (isRead) {
        return <span className="text-xs text-zinc-400">—</span>;
      }
      const isPending = options.markReadPendingId === notificationId;
      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="normal-case tracking-normal"
          isLoading={isPending}
          loadingText="…"
          aria-label={`Mark notification ${notificationId} as read`}
          onClick={() => options.onMarkRead(notificationId)}
        >
          Mark read
        </Button>
      );
    },
    enableColumnFilter: false,
    enableHiding: false,
    enableSorting: false,
    header: () => <span className="sr-only">Actions</span>,
    id: "actions",
    minSize: 10,
    size: 12,
  }),
];

export const IC_NOTIFICATION_DEFAULT_COLUMN_ORDER = [
  "isRead",
  "title",
  "documentType",
  "documentId",
  "priority",
  "message",
  "createdAt",
  "actions",
] as const;
