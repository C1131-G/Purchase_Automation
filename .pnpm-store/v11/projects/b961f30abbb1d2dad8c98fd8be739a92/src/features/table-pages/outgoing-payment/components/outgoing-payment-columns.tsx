// OutgoingPaymentColumns: Column definitions (accessors, headers, cell renderers) for the payment grid.
import { createColumnHelper } from "@tanstack/react-table";

import { Tooltip } from "@/components/tooltip";
import type { OutgoingPaymentListItem } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.service";
import { TableColumnSort } from "@/features/table-pages/table-shared/components/core/table-column-sort";
import {
  matchesDateRange,
  matchesNumberComparison,
} from "@/features/table-pages/table-shared/utils/table-filter-values";

const columnHelper = createColumnHelper<OutgoingPaymentListItem>();

interface CreateOutgoingPaymentColumnsOptions {
  onDocNumDoubleClick?: (docNum: string | number) => void;
  onDocNumHover?: (docNum: string | number) => void;
}

export const createOutgoingPaymentColumns = (options?: CreateOutgoingPaymentColumnsOptions) => [
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
    size: 17.5,
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
    size: 17.5,
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
      const amount = Number.parseFloat(String(info.getValue() ?? 0));
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
    minSize: 10,
    size: 17.5,
  }),
  columnHelper.accessor("PaymentMode", {
    cell: (info) => info.getValue() ?? "-",
    enableSorting: true,
    filterFn: "equalsString",
    header: ({ column, table }) => (
      <TableColumnSort
        column={column}
        sortingState={table.getState().sorting}
        title="Mode of Payment"
      />
    ),
    id: "PaymentMode",
    meta: {
      filterOptions: [
        { label: "M-Pesa", value: "M-Pesa" },
        { label: "My Cash", value: "My Cash" },
        { label: "EFTPOS", value: "EFTPOS" },
        { label: "Direct Pay", value: "Direct Pay" },
        { label: "CASH", value: "CASH" },
      ],
      filterType: "select",
    },
    minSize: 12,
    size: 17.5,
  }),
];
