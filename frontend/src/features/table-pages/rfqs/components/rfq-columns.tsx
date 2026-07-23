/**
 * Request For Quotation table columns — same chrome as purchase quotations
 * (DocNumCell, sorts, status chips). Row shape is IC RFQ header; labels mirror PQ
 * where fields align (Doc Number, Vendor, Status).
 */
import { createColumnHelper } from "@tanstack/react-table";

import { Tooltip } from "@/components/tooltip";
import type { IcRfqHeader } from "@/features/intercompany/schemas/intercompany-api.schema";
import { DocNumCell } from "@/features/table-pages/table-shared/components/core/doc-num-cell";
import { TableColumnSort } from "@/features/table-pages/table-shared/components/core/table-column-sort";
import { cn } from "@/shared/utils/cn";

const columnHelper = createColumnHelper<IcRfqHeader>();

const mapStatusLabel = (value: string): string => {
  const normalized = value?.toString().trim().toUpperCase();
  if (!normalized) {
    return "—";
  }
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
};

const statusClassName = (value: string): string => {
  const normalized = value?.toString().trim().toUpperCase();
  if (normalized === "DRAFT") {
    return "bg-amber-50 text-amber-900 ring-amber-200";
  }
  if (normalized === "SUBMITTED") {
    return "bg-sky-50 text-sky-900 ring-sky-200";
  }
  if (normalized === "COMPLETED") {
    return "bg-emerald-50 text-emerald-900 ring-emerald-200";
  }
  if (normalized === "CANCELLED") {
    return "bg-zinc-100 text-zinc-600 ring-zinc-200";
  }
  return "bg-zinc-50 text-zinc-700 ring-zinc-200";
};

export interface CreateRfqColumnsOptions {
  onDocNumDoubleClick?: (rfq: IcRfqHeader) => void;
  onDocNumHover?: (rfq: IcRfqHeader) => void;
}

export const createRfqColumns = (options?: CreateRfqColumnsOptions) => [
  columnHelper.accessor("rfqNumber", {
    cell: (info) => {
      const row = info.row.original;
      const docNum = info.getValue();
      return (
        <DocNumCell
          value={docNum}
          onHover={() => options?.onDocNumHover?.(row)}
          onDoubleClick={() => options?.onDocNumDoubleClick?.(row)}
        />
      );
    },
    enableSorting: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Number" />
    ),
    id: "DocNum",
    meta: { filterType: "text" },
    minSize: 12,
    size: 14,
    sortingFn: "alphanumeric",
  }),
  columnHelper.accessor("vendorCode", {
    cell: (info) => info.getValue() || "—",
    enableSorting: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort
        column={column}
        sortingState={table.getState().sorting}
        title="Vendor Code"
      />
    ),
    id: "CardCode",
    meta: { filterType: "text" },
    minSize: 12,
    size: 14,
  }),
  columnHelper.accessor("status", {
    cell: (info) => {
      const value = String(info.getValue() ?? "");
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
            statusClassName(value),
          )}
        >
          {mapStatusLabel(value)}
        </span>
      );
    },
    enableSorting: true,
    filterFn: (row, _columnId, filterValue) => {
      const raw = String(filterValue ?? "")
        .trim()
        .toUpperCase();
      if (!raw) {
        return true;
      }
      return String(row.original.status ?? "")
        .trim()
        .toUpperCase()
        .includes(raw);
    },
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Status" />
    ),
    id: "DocStatus",
    meta: {
      filterOptions: [
        { label: "Draft", value: "DRAFT" },
        { label: "Submitted", value: "SUBMITTED" },
        { label: "Completed", value: "COMPLETED" },
        { label: "Cancelled", value: "CANCELLED" },
      ],
      filterType: "select",
    },
    minSize: 12,
    size: 14,
  }),
  columnHelper.accessor("pqDraftDocNum", {
    cell: (info) => {
      const value = info.getValue();
      return value === null || value === undefined ? "—" : value;
    },
    enableSorting: true,
    filterFn: (row, _columnId, filterValue) => {
      const term = String(filterValue ?? "")
        .trim()
        .toLowerCase();
      if (!term) {
        return true;
      }
      const value = row.original.pqDraftDocNum;
      return String(value ?? "")
        .toLowerCase()
        .includes(term);
    },
    header: ({ column, table }) => (
      <TableColumnSort
        column={column}
        sortingState={table.getState().sorting}
        title="Purchase Quotation Draft No."
      />
    ),
    id: "pqDraftDocNum",
    meta: { filterType: "text" },
    minSize: 14,
    size: 16,
  }),
  columnHelper.accessor("pqDraftDocEntry", {
    cell: (info) => info.getValue() || "—",
    enableSorting: true,
    filterFn: (row, _columnId, filterValue) => {
      const term = String(filterValue ?? "")
        .trim()
        .toLowerCase();
      if (!term) {
        return true;
      }
      return String(row.original.pqDraftDocEntry ?? "")
        .toLowerCase()
        .includes(term);
    },
    header: ({ column, table }) => (
      <TableColumnSort
        column={column}
        sortingState={table.getState().sorting}
        title="Purchase Quotation Draft Entry"
      />
    ),
    id: "pqDraftDocEntry",
    meta: { filterType: "text" },
    minSize: 12,
    size: 14,
  }),
  columnHelper.accessor("sourceCompanyId", {
    cell: (info) => info.getValue(),
    enableSorting: true,
    filterFn: (row, _columnId, filterValue) => {
      const term = String(filterValue ?? "")
        .trim()
        .toLowerCase();
      if (!term) {
        return true;
      }
      return String(row.original.sourceCompanyId).toLowerCase().includes(term);
    },
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Source Co." />
    ),
    id: "sourceCompanyId",
    meta: { filterType: "text" },
    minSize: 10,
    size: 12,
  }),
  columnHelper.accessor("targetCompanyId", {
    cell: (info) => info.getValue(),
    enableSorting: true,
    filterFn: (row, _columnId, filterValue) => {
      const term = String(filterValue ?? "")
        .trim()
        .toLowerCase();
      if (!term) {
        return true;
      }
      return String(row.original.targetCompanyId).toLowerCase().includes(term);
    },
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Target Co." />
    ),
    id: "targetCompanyId",
    meta: { filterType: "text" },
    minSize: 10,
    size: 12,
  }),
  columnHelper.accessor("createdBy", {
    cell: (info) => {
      const value = info.getValue();
      if (!value) {
        return "—";
      }
      return (
        <Tooltip content={value} className="block w-full max-w-full truncate">
          {value}
        </Tooltip>
      );
    },
    enableSorting: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Created By" />
    ),
    id: "createdBy",
    meta: { filterType: "text" },
    minSize: 12,
    size: 14,
  }),
];

export const RFQ_DEFAULT_COLUMN_ORDER = [
  "DocNum",
  "CardCode",
  "DocStatus",
  "pqDraftDocNum",
  "pqDraftDocEntry",
  "sourceCompanyId",
  "targetCompanyId",
  "createdBy",
] as const;
