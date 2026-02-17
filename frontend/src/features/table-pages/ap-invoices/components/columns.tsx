import { createColumnHelper } from '@tanstack/react-table'

import { TableColumnSort } from '@/components/table/core/table-column-sort'
import { Tooltip } from '@/components/ui/tooltip'
import {
  matchesDateRange,
  matchesNumberComparison,
} from '@/components/ui/types/table-filter-values'
import { type APInvoiceListItem } from '@/features/table-pages/ap-invoices/api/ap-invoice.service'

const columnHelper = createColumnHelper<APInvoiceListItem>()

const mapDocStatusLabel = (value: string) => {
  const normalized = value?.toString().trim()
  if (normalized === 'O') return 'Open'
  if (normalized === 'C') return 'Closed'
  return normalized
}

export const createAPInvoiceColumns = () => [
  columnHelper.accessor('DocNum', {
    id: 'DocNum',
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Number" />
    ),
    cell: (info) => info.getValue(),
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
