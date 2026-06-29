// APCreditMemoColumns: Column definitions (accessors, headers, cell renderers) for the credit memo grid.
import { createColumnHelper } from "@tanstack/react-table";

import { Tooltip } from "@/components/tooltip";
import { DocNumCell } from "@/features/table-pages/table-shared/components/core/doc-num-cell";
import type { APCreditMemoListItem } from "@/features/table-pages/ap-credit-memo/api/ap-credit-memo.service";
import { TableColumnSort } from "@/features/table-pages/table-shared/components/core/table-column-sort";
import {
  matchesDateRange,
  matchesNumberComparison,
} from "@/features/table-pages/table-shared/utils/table-filter-values";
import { formatDocTotal } from "@/features/table-pages/table-shared/utils/currency-formatter";

const columnHelper = createColumnHelper<APCreditMemoListItem>();

const mapDocStatusLabel = (value: string) => {
  const normalized = value?.toString().trim();
  if (normalized === "O") {
    return "Open";
  }
  if (normalized === "C") {
    return "Closed";
  }
  if (normalized === "Draft") {
    return "Draft";
  }
  return normalized;
};

interface CreateAPCreditMemoColumnsOptions {
  onDocNumDoubleClick?: (
    docNum: string | number,
    isDraft: boolean,
    docEntry?: number | string,
  ) => void;
  onDocNumHover?: (docNum: string | number) => void;
}

export const createAPCreditMemoColumns = (options?: CreateAPCreditMemoColumnsOptions) => [
  columnHelper.accessor("DocNum", {
    cell: (info) => {
      const isDraft = info.row.original.DocStatus === "Draft";
      const displayVal = isDraft
        ? `${info.getValue()} (Draft #${info.row.original.id})`
        : info.getValue();
      return (
        <DocNumCell
          value={displayVal}
          docEntry={isDraft ? undefined : (info.row.original.id as number)}
          docType={isDraft ? undefined : "ap-credit-memo"}
          onHover={
            options?.onDocNumHover
              ? () => options.onDocNumHover?.(String(info.row.original.DocNum))
              : undefined
          }
          onDoubleClick={
            options?.onDocNumDoubleClick
              ? () =>
                  options.onDocNumDoubleClick?.(
                    info.row.original.DocNum,
                    isDraft,
                    info.row.original.id,
                  )
              : undefined
          }
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
      const currency = info.row.original.DocCurr ?? "";
      return formatDocTotal(info.getValue(), currency);
    },
    enableColumnFilter: true,
    filterFn: (row, columnId, filterValue) =>
      matchesNumberComparison(row.getValue(columnId), filterValue),
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Total" />
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
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Status" />
    ),
    id: "DocStatus",
    meta: {
      filterOptions: [
        { label: "Open", value: "Open" },
        { label: "Closed", value: "Closed" },
        { label: "Draft", value: "Draft" },
      ],
      filterType: "select",
    },
    minSize: 12,
    size: 14,
  }),
];
