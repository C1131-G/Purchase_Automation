import { createColumnHelper } from "@tanstack/react-table";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import type { IcRetryQueueItem } from "@/features/intercompany/schemas/intercompany-api.schema";
import { TableColumnSort } from "@/features/table-pages/table-shared/components/core/table-column-sort";
import { cn } from "@/shared/utils/cn";

const columnHelper = createColumnHelper<IcRetryQueueItem>();

const formatNextRetryAt = (value: string | null | undefined): string => {
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

const statusClassName = (status: string): string => {
  const normalized = status.trim().toUpperCase();
  if (normalized === "DEAD") {
    return "bg-red-50 text-red-800 ring-red-200";
  }
  if (normalized === "WAITING") {
    return "bg-amber-50 text-amber-900 ring-amber-200";
  }
  if (normalized === "PROCESSING") {
    return "bg-sky-50 text-sky-800 ring-sky-200";
  }
  if (normalized === "SUCCESS") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  }
  return "bg-zinc-100 text-zinc-700 ring-zinc-200";
};

const canRunRetry = (status: string): boolean => {
  const normalized = status.trim().toUpperCase();
  return normalized === "WAITING" || normalized === "DEAD";
};

export interface CreateIcRetryColumnsOptions {
  runPendingId: number | null;
  onRun: (retryId: number) => void;
}

export const createIcRetryColumns = (options: CreateIcRetryColumnsOptions) => [
  columnHelper.accessor("status", {
    cell: (info) => {
      const value = info.getValue() || "—";
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
            statusClassName(String(value)),
          )}
        >
          {value}
        </span>
      );
    },
    enableSorting: true,
    filterFn: (row, _columnId, filterValue) => {
      const raw = String(filterValue ?? "")
        .trim()
        .toUpperCase();
      if (!raw || raw === "ALL") {
        return true;
      }
      return String(row.original.status).trim().toUpperCase() === raw;
    },
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Status" />
    ),
    id: "status",
    meta: {
      filterType: "select",
      filterOptions: [
        { label: "All", value: "all" },
        { label: "Waiting", value: "WAITING" },
        { label: "Processing", value: "PROCESSING" },
        { label: "Success", value: "SUCCESS" },
        { label: "Dead", value: "DEAD" },
      ],
    },
    minSize: 10,
    size: 12,
  }),
  columnHelper.accessor("actionCode", {
    cell: (info) => (
      <span className="font-mono text-xs font-medium text-zinc-800">{info.getValue() || "—"}</span>
    ),
    enableSorting: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Action" />
    ),
    id: "actionCode",
    meta: { filterType: "text" },
    minSize: 12,
    size: 14,
  }),
  columnHelper.accessor("sourceDocument", {
    cell: (info) => {
      const value = info.getValue();
      return value ? <span className="font-mono text-xs text-zinc-800">{value}</span> : "—";
    },
    enableSorting: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Source" />
    ),
    id: "sourceDocument",
    meta: { filterType: "text" },
    minSize: 12,
    size: 14,
  }),
  columnHelper.accessor("targetDocument", {
    cell: (info) => {
      const value = info.getValue();
      return value ? <span className="font-mono text-xs text-zinc-800">{value}</span> : "—";
    },
    enableSorting: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Target" />
    ),
    id: "targetDocument",
    meta: { filterType: "text" },
    minSize: 10,
    size: 12,
  }),
  columnHelper.accessor("retryCount", {
    cell: (info) => {
      const count = info.getValue();
      const max = info.row.original.maxRetry;
      return (
        <span className="tabular-nums text-zinc-700">
          {count}
          <span className="text-zinc-400"> / {max}</span>
        </span>
      );
    },
    enableSorting: true,
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Attempts" />
    ),
    id: "retryCount",
    minSize: 8,
    size: 10,
  }),
  columnHelper.accessor("nextRetryAt", {
    cell: (info) => formatNextRetryAt(info.getValue()),
    enableSorting: true,
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Next run" />
    ),
    id: "nextRetryAt",
    minSize: 12,
    size: 14,
  }),
  columnHelper.accessor("errorMessage", {
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
    header: () => <span>Error</span>,
    id: "errorMessage",
    meta: { filterType: "text" },
    minSize: 16,
    size: 20,
  }),
  columnHelper.display({
    cell: ({ row }) => {
      const { retryId, status } = row.original;
      if (!canRunRetry(String(status))) {
        return <span className="text-xs text-zinc-400">—</span>;
      }
      const isPending = options.runPendingId === retryId;
      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="normal-case tracking-normal"
          isLoading={isPending}
          loadingText="…"
          aria-label={`Run retry ${retryId}`}
          onClick={() => options.onRun(retryId)}
        >
          Run
        </Button>
      );
    },
    enableColumnFilter: false,
    enableHiding: false,
    enableSorting: false,
    header: () => <span className="sr-only">Actions</span>,
    id: "actions",
    minSize: 10,
    size: 10,
  }),
];

export const IC_RETRY_DEFAULT_COLUMN_ORDER = [
  "status",
  "actionCode",
  "sourceDocument",
  "targetDocument",
  "retryCount",
  "nextRetryAt",
  "errorMessage",
  "actions",
] as const;
