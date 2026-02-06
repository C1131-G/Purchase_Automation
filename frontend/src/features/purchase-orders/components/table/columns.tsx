import { createColumnHelper } from '@tanstack/react-table'
import { TableColumnSort } from '@/components/table/core/table-column-sort'
import { type PurchaseOrder } from '@/features/purchase-orders/api/purchase-orders.api'


const columnHelper = createColumnHelper<PurchaseOrder>()

export const createColumns = () => [
    columnHelper.accessor('DocEntry', {
        id: 'DocEntry',
        header: ({ column, table }) => (
            <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Entry" />
        ),
        cell: (info) => info.getValue(),
        filterFn: 'includesString',
        enableSorting: true,
        sortingFn: 'basic',
        meta: { filterType: 'text' },
    }),
    columnHelper.accessor('DocNum', {
        id: 'DocNum',
        header: ({ column, table }) => (
            <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Number" />
        ),
        cell: (info) => info.getValue(),
        filterFn: 'includesString',
        enableSorting: true,
        sortingFn: 'basic',
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
            return new Date(date).toLocaleDateString()
        },
        filterFn: (row, columnId, filterValue) => {
            const rawValue = String(row.getValue(columnId) ?? '')
            const rowDate = rawValue.slice(0, 10)
            if (!rowDate) return true

            if (!filterValue || typeof filterValue !== 'object') return true

            const from = typeof (filterValue as { from?: unknown }).from === 'string'
                ? (filterValue as { from?: string }).from
                : undefined
            const to = typeof (filterValue as { to?: unknown }).to === 'string'
                ? (filterValue as { to?: string }).to
                : undefined

            if (!from && !to) return true
            if (from && !to) return rowDate === from
            if (!from && to) return rowDate === to

            const start = from! <= to! ? from! : to!
            const end = from! <= to! ? to! : from!
            return rowDate >= start && rowDate <= end
        },
        meta: { filterType: 'date' },
    }),
    columnHelper.accessor('CardCode', {
        id: 'CardCode',
        header: ({ column, table }) => (
            <TableColumnSort column={column} sortingState={table.getState().sorting} title="Vendor Code" />
        ),
        cell: (info) => info.getValue(),
        filterFn: 'includesString',
        meta: { filterType: 'text' },
    }),
    columnHelper.accessor('CardName', {
        id: 'CardName',
        header: ({ column, table }) => (
            <TableColumnSort column={column} sortingState={table.getState().sorting} title="Vendor Name" />
        ),
        cell: (info) => info.getValue(),
        filterFn: 'includesString',
        meta: { filterType: 'text' },
    }),
    columnHelper.accessor('DocTotal', {
        id: 'DocTotal',
        header: ({ column, table }) => (
            <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Total" />
        ),
        cell: (info) => {
            const amount = parseFloat(info.getValue())
            return new Intl.NumberFormat('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(amount)
        },
        filterFn: (row, columnId, filterValue) => {
            const rowRaw = row.getValue(columnId)
            // Robust parsing: handles numbers and strings with symbols/commas
            const cleanRow = typeof rowRaw === 'string'
                ? rowRaw.replace(/[^0-9.-]/g, '')
                : String(rowRaw ?? '')

            const rowValue = parseFloat(cleanRow)
            if (!Number.isFinite(rowValue)) return false

            if (!filterValue || typeof filterValue !== 'object' || Array.isArray(filterValue)) return true

            const candidate = filterValue as { operator?: string; value?: number | string }
            const operator = candidate.operator
            const value = typeof candidate.value === 'number' ? candidate.value : parseFloat(String(candidate.value ?? ''))

            if (!operator || !Number.isFinite(value)) return true
            if (operator !== 'eq' && operator !== 'lt' && operator !== 'gt') return true

            // Use raw numeric comparison for lt/gt and epsilon-based equality.
            const EPSILON = 1e-9
            if (operator === 'eq') return Math.abs(rowValue - value) < EPSILON
            if (operator === 'lt') return rowValue < value
            if (operator === 'gt') return rowValue > value
            return true
        },
        enableColumnFilter: true,
        meta: { filterType: 'number-comparison' },
    }),
    columnHelper.accessor('DocStatus', {
        id: 'DocStatus',
        header: ({ column, table }) => (
            <TableColumnSort column={column} sortingState={table.getState().sorting} title="Doc Status" />
        ),
        cell: (info) => info.getValue(),
        filterFn: 'equalsString',
        meta: {
            filterType: 'select',
            filterOptions: [
                { label: 'Open', value: 'Open' },
                { label: 'Closed', value: 'Closed' },
            ],
        },
    }),
    columnHelper.accessor('Canceled', {
        id: 'Canceled',
        header: ({ column, table }) => (
            <TableColumnSort column={column} sortingState={table.getState().sorting} title="Canceled" />
        ),
        cell: (info) => info.getValue(),
        filterFn: 'equalsString',
        meta: {
            filterType: 'select',
            filterOptions: [
                { label: 'Yes (Canceled)', value: 'Yes' },
                { label: 'No (Active)', value: 'No' },
            ],
        },
    }),
]
