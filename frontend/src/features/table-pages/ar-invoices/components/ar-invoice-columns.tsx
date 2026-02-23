// ARInvoiceColumns: Column definitions (accessors, headers, cell renderers) for the accounts receivable grid.
import { createColumnHelper } from '@tanstack/react-table'

import { Tooltip } from '@/components/tooltip'
import { type ARInvoiceListItem } from '@/features/table-pages/ar-invoices/api/ar-invoice.service'
import { TableColumnSort } from '@/features/table-pages/table-shared/components/core/table-column-sort'
import {
  matchesDateRange,
  matchesNumberComparison,
} from '@/features/table-pages/table-shared/utils/table-filter-values'

const columnHelper = createColumnHelper<ARInvoiceListItem>()

const mapDocStatusLabel = (value: string) => {
  const normalized = value?.toString().trim()
  if (normalized === 'O') return 'Open'
  if (normalized === 'C') return 'Closed'
  return normalized
}

export const createARInvoiceColumns = () => [
  columnHelper.accessor('DocNum', {
    id: 'DocNum',
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Number" />
    ),
    cell: (info) => (
      <Tooltip content="Double click to edit">
        <span className="block cursor-pointer truncate transition-colors hover:text-blue-600">
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
        title="Customer Code"
      />
    ),
    cell: (info) => info.getValue(),
    filterFn: 'includesString',
    size: 16,
    minSize: 14,
    meta: { filterType: 'text' },
  }),
  columnHelper.accessor('CardName', {
    id: 'CardName',
    header: ({ column, table }) => (
      <TableColumnSort
        column={column}
        sortingState={table.getState().sorting}
        title="Customer Name"
      />
    ),
    cell: (info) => {
      const value = info.getValue()
      const display = value ?? ''
      return (
        <Tooltip content={String(display)} className="block w-full max-w-full truncate">
          {display}
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
      const formattedAmount = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
      return `${currency} ${formattedAmount}`.trim()
    },
    filterFn: (_row, _columnId, filterValue) =>
      matchesNumberComparison(_row.getValue(_columnId), filterValue),
    enableColumnFilter: true,
    size: 14,
    minSize: 12,
    meta: { filterType: 'number-comparison' },
  }),
  columnHelper.accessor('NumAtCard', {
    id: 'NumAtCard',
    header: ({ column, table }) => (
      <TableColumnSort
        column={column}
        sortingState={table.getState().sorting}
        title="Customer Ref"
      />
    ),
    cell: (info) => info.getValue() ?? '-',
    filterFn: 'includesString',
    enableColumnFilter: true,
    size: 14,
    minSize: 12,
    meta: { filterType: 'text' },
  }),
  columnHelper.accessor('DocStatus', {
    id: 'DocStatus',
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Status" />
    ),
    cell: (info) => mapDocStatusLabel(info.getValue()),
    filterFn: 'equalsString',
    size: 14,
    minSize: 12,
    meta: {
      filterType: 'select',
      filterOptions: [
        { label: 'Open', value: 'Open' },
        { label: 'Closed', value: 'Closed' },
      ],
    },
  }),
]
