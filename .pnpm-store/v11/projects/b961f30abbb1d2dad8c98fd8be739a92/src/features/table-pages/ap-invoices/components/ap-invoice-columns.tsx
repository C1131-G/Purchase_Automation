// APInvoiceColumns: Column definitions (accessors, headers, cell renderers) for the accounts payable grid.
import { createColumnHelper } from "@tanstack/react-table";

import { Tooltip } from "@/components/tooltip";
import type { APInvoiceListItem } from "@/features/table-pages/ap-invoices/api/ap-invoice.service";
import { TableColumnSort } from "@/features/table-pages/table-shared/components/core/table-column-sort";
import {
  matchesDateRange,
  matchesNumberComparison,
} from "@/features/table-pages/table-shared/utils/table-filter-values";

const columnHelper = createColumnHelper<APInvoiceListItem>();

const mapDocStatusLabel = (value: string) => {
  const normalized = value?.toString().trim();
  if (normalized === "O") {
    return "Open";
  }
  if (normalized === "C") {
    return "Closed";
  }
  return normalized;
};

export const createAPInvoiceColumns = (options?: {
  onDocNumDoubleClick?: (docNum: string) => void;
  onDocNumHover?: (docNum: string) => void;
}) => {
  const baseColumns = [
    columnHelper.accessor("DocNum", {
      cell: (info) => (
        <Tooltip content="Double click to edit">
          <span
            className="block cursor-pointer truncate transition-colors hover:text-blue-600"
            onDoubleClick={() => options?.onDocNumDoubleClick?.(String(info.getValue()))}
            onMouseEnter={() => options?.onDocNumHover?.(String(info.getValue()))}
          >
            {info.getValue()}
          </span>
        </Tooltip>
      ),
      enableSorting: true,
      filterFn: "includesString",
      header: ({ column, table }) => (
        <TableColumnSort
          column={column}
          sortingState={table.getState().sorting}
          title="Doc Number"
        />
      ),
      id: "DocNum",
      meta: { filterType: "text" },
      minSize: 12,
      size: 14,
      sortingFn: "basic",
    }),
    columnHelper.accessor("DocDate", {
      cell: (info) => {
        const date = info.getValue();
        if (!date) {
          return "-";
        }
        return new Date(date).toLocaleDateString("en-GB");
      },
      filterFn: (row, columnId, filterValue) =>
        matchesDateRange(row.getValue(columnId), filterValue),
      header: ({ column, table }) => (
        <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Date" />
      ),
      id: "DocDate",
      meta: { filterType: "date" },
      minSize: 12,
      size: 14,
    }),
    columnHelper.accessor("CardCode", {
      cell: (info) => info.getValue(),
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
    columnHelper.accessor("CardName", {
      cell: (info) => {
        const value = info.getValue();
        const display = value ?? "";
        return (
          <Tooltip content={String(display)} className="block w-full max-w-full truncate">
            {display}
          </Tooltip>
        );
      },
      filterFn: "includesString",
      header: ({ column, table }) => (
        <TableColumnSort
          column={column}
          sortingState={table.getState().sorting}
          title="Vendor Name"
        />
      ),
      id: "CardName",
      meta: { filterType: "text" },
      minSize: 25,
      size: 30,
    }),
    columnHelper.accessor("DocTotal", {
      cell: (info) => {
        const amount = Number.parseFloat(String(info.getValue()));
        const currency = info.row.original.DocCurr ?? "";
        const formattedAmount = new Intl.NumberFormat("en-IN", {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        }).format(amount);
        return `${currency} ${formattedAmount}`.trim();
      },
      enableColumnFilter: true,
      filterFn: (row, columnId, filterValue) =>
        matchesNumberComparison(row.getValue(columnId), filterValue),
      header: ({ column, table }) => (
        <TableColumnSort
          column={column}
          sortingState={table.getState().sorting}
          title="Doc Total"
        />
      ),
      id: "DocTotal",
      meta: { filterType: "number-comparison" },
      minSize: 12,
      size: 14,
    }),
    columnHelper.accessor("DocStatus", {
      cell: (info) => mapDocStatusLabel(info.getValue()),
      filterFn: "equalsString",
      header: ({ column, table }) => (
        <TableColumnSort
          column={column}
          sortingState={table.getState().sorting}
          title="Doc Status"
        />
      ),
      id: "DocStatus",
      meta: {
        filterOptions: [
          { label: "Open", value: "Open" },
          { label: "Closed", value: "Closed" },
        ],
        filterType: "select",
      },
      minSize: 12,
      size: 14,
    }),
  ];

  return baseColumns;
};
