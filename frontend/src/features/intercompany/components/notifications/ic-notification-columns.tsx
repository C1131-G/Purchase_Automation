import { createColumnHelper } from "@tanstack/react-table";
import { Check } from "lucide-react";

import { Button } from "@/components/button";
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

/**
 * Notifications grid order:
 * Doc ID → Created → Message → Status → Priority → Actions
 */
export const createIcNotificationColumns = (options: CreateIcNotificationColumnsOptions) => [
  columnHelper.accessor("documentId", {
    cell: (info) => {
      const value = info.getValue();
      if (!value) {
        return "—";
      }
      return (
        <span className="font-mono text-sm font-semibold tabular-nums whitespace-nowrap text-zinc-900">
          {value}
        </span>
      );
    },
    enableColumnFilter: false,
    enableSorting: true,
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc ID" />
    ),
    id: "documentId",
    minSize: 12,
    size: 14,
  }),
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
    size: 14,
  }),
  columnHelper.accessor("message", {
    cell: (info) => {
      const value = info.getValue();
      if (!value) {
        return "—";
      }
      return <span className="block whitespace-pre-wrap break-words text-zinc-700">{value}</span>;
    },
    enableColumnFilter: false,
    enableSorting: true,
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Message" />
    ),
    id: "message",
    minSize: 30,
    size: 36,
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
    size: 10,
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
    size: 10,
  }),
  columnHelper.display({
    cell: ({ row }) => {
      const { isRead, notificationId } = row.original;
      if (isRead) {
        return (
          <div className="flex w-full items-center justify-start">
            <span className="inline-block min-w-[7.5rem] text-left text-xs text-zinc-400">—</span>
          </div>
        );
      }
      const isPending = options.markReadPendingId === notificationId;
      return (
        <div className="flex w-full items-center justify-start">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 min-w-[7.5rem] gap-1.5 px-4 normal-case tracking-normal shadow-sm"
            isLoading={isPending}
            loadingText="Reading…"
            aria-label={`Mark notification ${notificationId} as read`}
            onClick={() => options.onMarkRead(notificationId)}
          >
            <Check className="size-3.5 stroke-[2.5px]" aria-hidden />
            Read
          </Button>
        </div>
      );
    },
    enableColumnFilter: false,
    enableHiding: false,
    enableSorting: false,
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Read" />
    ),
    id: "actions",
    minSize: 12,
    size: 14,
  }),
];

export const IC_NOTIFICATION_DEFAULT_COLUMN_ORDER = [
  "documentId",
  "createdAt",
  "message",
  "isRead",
  "priority",
  "actions",
] as const;
