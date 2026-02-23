// PurchaseOrderColumns: Column definitions (accessors, headers, cell renderers) for the order grid.
import { createColumnHelper } from '@tanstack/react-table'

import { Tooltip } from '@/components/tooltip'
import { type PurchaseOrderListItem } from '@/features/table-pages/purchase-orders/api/purchase-order.service'
import { TableColumnSort } from '@/features/table-pages/table-shared/components/core/table-column-sort'
import {
  matchesDateRange,
  matchesNumberComparison,
} from '@/features/table-pages/table-shared/utils/table-filter-values'

const columnHelper = createColumnHelper<PurchaseOrderListItem>()

const mapDocStatusLabel = (value: string) => {
  const normalized = value?.toString().trim()
  if (normalized === 'O') return 'Open'
  if (normalized === 'C') return 'Closed'
  return normalized
}

interface CreatePurchaseOrderColumnsOptions {
  onDocNumDoubleClick?: (docNum: string | number) => void
  onDocNumHover?: (docNum: string | number) => void
}

export const createPurchaseOrderColumns = (options?: CreatePurchaseOrderColumnsOptions) => [
  columnHelper.accessor('DocNum', {
    id: 'DocNum',
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Number" />
    ),
    cell: (info) => (
      <Tooltip content="Double click to edit">
        <span
          className="block cursor-pointer truncate transition-colors hover:text-blue-600"
          onMouseEnter={() => options?.onDocNumHover?.(info.getValue())}
          onFocus={() => options?.onDocNumHover?.(info.getValue())}
          onDoubleClick={() => options?.onDocNumDoubleClick?.(info.getValue())}
        >
          {info.getValue()}
        </span>
      </Tooltip>
    ),
    filterFn: 'includesString',
    enableSorting: true,
    sortingFn: 'basic',
    size: 14,
    minSize: 12,
    meta: { filterType: 'text' },
  }),
  columnHelper.accessor('DocDate', {
    id: 'DocDate',
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Date" />
    ),
    cell: (info) => {
      const date = info.getValue()
      if (!date) return '-'
      return new Date(date).toLocaleDateString('en-GB')
    },
    filterFn: (row, columnId, filterValue) => matchesDateRange(row.getValue(columnId), filterValue),
    size: 14,
    minSize: 12,
    meta: { filterType: 'date' },
  }),
  columnHelper.accessor('CardCode', {
    id: 'CardCode',
    header: ({ column, table }) => (
      <TableColumnSort
        column={column}
        sortingState={table.getState().sorting}
        title="Vendor Code"
      />
    ),
    cell: (info) => info.getValue(),
    filterFn: 'includesString',
    size: 14,
    minSize: 12,
    meta: { filterType: 'text' },
  }),
  columnHelper.accessor('CardName', {
    id: 'CardName',
    header: ({ column, table }) => (
      <TableColumnSort
        column={column}
        sortingState={table.getState().sorting}
        title="Vendor Name"
      />
    ),
    cell: (info) => {
      const value = info.getValue()
      return (
        <Tooltip content={value ?? ''}>
          <span className="block truncate">{value}</span>
        </Tooltip>
      )
    },
    filterFn: 'includesString',
    size: 30,
    minSize: 25,
    meta: { filterType: 'text' },
  }),
  columnHelper.accessor('DocTotal', {
    id: 'DocTotal',
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Total" />
    ),
    cell: (info) => {
      const amount = parseFloat(String(info.getValue()))
      const currency = info.row.original.DocCurr ?? ''
      const formatted = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
      return `${currency} ${formatted}`.trim()
    },
    filterFn: (row, columnId, filterValue) =>
      matchesNumberComparison(row.getValue(columnId), filterValue),
    enableColumnFilter: true,
    size: 14,
    minSize: 12,
    meta: { filterType: 'number-comparison' },
  }),
  columnHelper.accessor('DocStatus', {
    id: 'DocStatus',
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Status" />
    ),
    cell: (info) => mapDocStatusLabel(info.getValue()),
    filterFn: 'equalsString',
    size: 14,
    minSize: 10,
    meta: {
      filterType: 'select',
      filterOptions: [
        { label: 'Open', value: 'Open' },
        { label: 'Closed', value: 'Closed' },
      ],
    },
  }),
]
