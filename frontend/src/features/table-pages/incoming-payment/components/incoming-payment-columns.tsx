// IncomingPaymentColumns: Column definitions (accessors, headers, cell renderers) for the payment grid.
import { createColumnHelper } from '@tanstack/react-table'

import { Tooltip } from '@/components/tooltip'
import { type IncomingPaymentListItem } from '@/features/table-pages/incoming-payment/api/incoming-payment.service'
import { TableColumnSort } from '@/features/table-pages/table-shared/components/core/table-column-sort'
import {
  matchesDateRange,
  matchesNumberComparison,
} from '@/features/table-pages/table-shared/utils/table-filter-values'

const columnHelper = createColumnHelper<IncomingPaymentListItem>()

interface CreateIncomingPaymentColumnsOptions {
  onDocNumDoubleClick?: (docNum: string | number) => void
  onDocNumHover?: (docNum: string | number) => void
}

export const createIncomingPaymentColumns = (options?: CreateIncomingPaymentColumnsOptions) => [
  columnHelper.accessor('DocNum', {
    id: 'DocNum',
    header: ({ column, table }) => (
      <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Number" />
    ),
    cell: (info) => (
      <Tooltip content="Click to view details">
        <span
          className="block cursor-pointer truncate transition-colors hover:text-blue-600"
          role="button"
          tabIndex={0}
          onMouseEnter={() => options?.onDocNumHover?.(info.getValue())}
          onFocus={() => options?.onDocNumHover?.(info.getValue())}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              options?.onDocNumDoubleClick?.(info.getValue())
            }
          }}
          onDoubleClick={() => options?.onDocNumDoubleClick?.(info.getValue())}
          onClick={() => options?.onDocNumDoubleClick?.(info.getValue())}
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
        title="Customer Code"
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
  columnHelper.accessor('PaymentMode', {
    id: 'PaymentMode',
    header: ({ column, table }) => (
      <TableColumnSort
        column={column}
        sortingState={table.getState().sorting}
        title="Payment Mode"
      />
    ),
    cell: (info) => info.getValue() ?? '-',
    filterFn: 'includesString',
    enableColumnFilter: true,
    size: 12,
    minSize: 10,
    meta: { filterType: 'text' },
  }),
]
