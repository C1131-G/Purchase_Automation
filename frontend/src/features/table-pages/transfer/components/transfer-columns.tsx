import { createColumnHelper } from "@tanstack/react-table";
import type { TransferListItem } from "@/features/table-pages/transfer/api/transfer.service";
import { DocNumCell } from "@/features/table-pages/table-shared/components/core/doc-num-cell";
import { TableColumnSort } from "@/features/table-pages/table-shared/components/core/table-column-sort";
import {
  matchesDateRange,
  matchesNumberComparison,
} from "@/features/table-pages/table-shared/utils/table-filter-values";
import { formatDocTotal } from "@/features/table-pages/table-shared/utils/currency-formatter";

const columnHelper = createColumnHelper<TransferListItem>();

export const createTransferColumns = () => {
  return [
    columnHelper.accessor("DocNum", {
      cell: (info) => (
        <DocNumCell
          value={info.getValue()}
          docEntry={info.row.original.id as number}
          docType="transfer"
        />
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
        if (!date) return "-";
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
    columnHelper.accessor("Filler", {
      cell: (info) => info.getValue() || "-",
      filterFn: "includesString",
      header: ({ column, table }) => (
        <TableColumnSort column={column} sortingState={table.getState().sorting} title="From Whs" />
      ),
      id: "Filler",
      meta: { filterType: "text" },
      minSize: 10,
      size: 12,
    }),
    columnHelper.accessor("ToWhsCode", {
      cell: (info) => info.getValue() || "-",
      filterFn: "includesString",
      header: ({ column, table }) => (
        <TableColumnSort column={column} sortingState={table.getState().sorting} title="To Whs" />
      ),
      id: "ToWhsCode",
      meta: { filterType: "text" },
      minSize: 10,
      size: 12,
    }),
    columnHelper.accessor("DocTotal", {
      cell: (info) => formatDocTotal(info.getValue(), info.row.original.DocCurr ?? "FJD"),
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
      cell: (info) => info.getValue(),
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
      minSize: 10,
      size: 14,
    }),
  ];
};
