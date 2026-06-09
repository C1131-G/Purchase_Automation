// IncomingPaymentColumns: Column definitions (accessors, headers, cell renderers) for the payment grid.
import { createColumnHelper } from "@tanstack/react-table";

import { Tooltip } from "@/components/tooltip";
import { DocNumCell } from "@/features/table-pages/table-shared/components/core/doc-num-cell";
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
      <DocNumCell
        value={info.getValue()}
        docEntry={info.row.original.id as number}
        docType="incoming-payment"
        onHover={options?.onDocNumHover}
        onDoubleClick={options?.onDocNumDoubleClick}
      />
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
      const rawAmount = Number.parseFloat(String(info.getValue()));
      const amount = Math.round(rawAmount * 20) / 20;
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
