// IncomingPaymentColumns: Column definitions (accessors, headers, cell renderers) for the payment grid.
import { createColumnHelper } from "@tanstack/react-table";

import { Tooltip } from "@/components/tooltip";
import type { IncomingPaymentListItem } from "@/features/table-pages/incoming-payment/api/incoming-payment.service";
import { TableColumnSort } from "@/features/table-pages/table-shared/components/core/table-column-sort";
import {
  matchesDateRange,
  matchesNumberComparison,
} from "@/features/table-pages/table-shared/utils/table-filter-values";

const columnHelper = createColumnHelper<IncomingPaymentListItem>();

interface CreateIncomingPaymentColumnsOptions {
  onDocNumDoubleClick?: (docNum: string | number) => void;
  onDocNumHover?: (docNum: string | number) => void;
}

export const createIncomingPaymentColumns = (options?: CreateIncomingPaymentColumnsOptions) => [
  columnHelper.accessor("DocNum", {
    cell: (info) => (
      <Tooltip content="Click to view details">
        <span
          className="block cursor-pointer truncate transition-colors hover:text-blue-600"
          role="button"
          tabIndex={0}
          onMouseEnter={() => options?.onDocNumHover?.(info.getValue())}
          onFocus={() => options?.onDocNumHover?.(info.getValue())}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              options?.onDocNumDoubleClick?.(info.getValue());
            }
          }}
          onDoubleClick={() => options?.onDocNumDoubleClick?.(info.getValue())}
          onClick={() => options?.onDocNumDoubleClick?.(info.getValue())}
        >
          {info.getValue()}
        </span>
      </Tooltip>
    ),
    enableSorting: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Number" />
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
    filterFn: (row, columnId, filterValue) => matchesDateRange(row.getValue(columnId), filterValue),
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
        title="Customer Code"
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
        title="Customer Name"
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
    filterFn: (_row, _columnId, filterValue) =>
      matchesNumberComparison(_row.getValue(_columnId), filterValue),
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Total" />
    ),
    id: "DocTotal",
    meta: { filterType: "number-comparison" },
    minSize: 12,
    size: 14,
  }),
  columnHelper.accessor("PaymentMode", {
    cell: (info) => info.getValue() ?? "-",
    enableColumnFilter: true,
    filterFn: "includesString",
    header: ({ column, table }) => (
      <TableColumnSort
        column={column}
        sortingState={table.getState().sorting}
        title="Payment Mode"
      />
    ),
    id: "PaymentMode",
    meta: { filterType: "text" },
    minSize: 10,
    size: 12,
  }),
];
