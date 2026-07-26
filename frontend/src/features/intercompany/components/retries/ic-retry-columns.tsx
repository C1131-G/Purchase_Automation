import { createColumnHelper } from "@tanstack/react-table";
import { Play } from "lucide-react";

import { Button } from "@/components/button";
import type { IcRetryQueueItem } from "@/features/intercompany/schemas/intercompany-api.schema";
import { TableColumnSort } from "@/features/table-pages/table-shared/components/core/table-column-sort";
import { cn } from "@/shared/utils/cn";

const columnHelper = createColumnHelper<IcRetryQueueItem>();

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

/**
 * Lean IC retry grid — no row id / company id / payload clutter.
 * Ops-focused: status, docs, attempts, error, run.
 */
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
  columnHelper.accessor("sourceDocument", {
    cell: (info) => {
      const value = info.getValue();
      return value ? (
        <span className="font-mono text-xs whitespace-normal break-all text-zinc-800">{value}</span>
      ) : (
        "—"
      );
    },
    enableSorting: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Source Doc" />
    ),
    id: "sourceDocument",
    meta: { filterType: "text" },
    minSize: 14,
    size: 16,
  }),
  columnHelper.accessor("targetDocument", {
    cell: (info) => {
      const value = info.getValue();
      return value ? (
        <span className="font-mono text-xs whitespace-normal break-all text-zinc-800">{value}</span>
      ) : (
        "—"
      );
    },
    enableSorting: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Target Doc" />
    ),
    id: "targetDocument",
    meta: { filterType: "text" },
    minSize: 14,
    size: 16,
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
    minSize: 10,
    size: 12,
  }),
  columnHelper.accessor("errorMessage", {
    cell: (info) => {
      const value = info.getValue();
      if (!value) {
        return "—";
      }
      return <span className="block whitespace-pre-wrap break-words text-zinc-600">{value}</span>;
    },
    enableSorting: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Error" />
    ),
    id: "errorMessage",
    meta: { filterType: "text" },
    minSize: 20,
    size: 26,
  }),
  columnHelper.display({
    cell: ({ row }) => {
      const { retryId, status } = row.original;
      if (!canRunRetry(String(status))) {
        return (
          <span className="inline-block min-w-[7.5rem] text-center text-xs text-zinc-400">—</span>
        );
      }
      const isPending = options.runPendingId === retryId;
      return (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-9 min-w-[7.5rem] gap-1.5 px-4 normal-case tracking-normal shadow-sm"
          isLoading={isPending}
          loadingText="Running…"
          aria-label={`Run retry ${retryId}`}
          onClick={() => options.onRun(retryId)}
        >
          <Play className="size-3.5 fill-current" aria-hidden />
          Run
        </Button>
      );
    },
    enableColumnFilter: false,
    enableHiding: false,
    enableSorting: false,
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Run" />
    ),
    id: "actions",
    minSize: 12,
    size: 14,
  }),
];

export const IC_RETRY_DEFAULT_COLUMN_ORDER = [
  "status",
  "sourceDocument",
  "targetDocument",
  "retryCount",
  "errorMessage",
  "actions",
] as const;
