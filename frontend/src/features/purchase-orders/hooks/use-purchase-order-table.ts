import { useEffect, useMemo } from 'react'
import {
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type SortingState,
    type VisibilityState,
    useReactTable,
} from '@tanstack/react-table'
import { type PurchaseOrderSearch } from '@/features/purchase-orders/schemas/purchase-order-search.schema'
import { purchaseOrdersSampleData as sampleData } from '@/features/purchase-orders/api/purchase-orders.api'
import { createColumns } from '@/features/purchase-orders/components/table/columns'
import { normalizeColumnFilters } from '@/components/ui/types/filter-utils'
import { useSetColumnFiltersAction } from '@/store/table/table-filter.store'
import { useClearAllFiltersAction } from '@/store/table/table-filter.store'
import { useSetOrderAction } from '@/store/table/table-order.store'
import { useSetPaginationAction } from '@/store/table/table-pagination.store'
import { useSetSortingAction } from '@/store/table/table-sorting.store'
import { useSetVisibilityAction } from '@/store/table/table-visibility.store'
import { createLogger } from '@/utils/logger'

interface UsePurchaseOrderTableProps {
    tableId: string
    searchParams: PurchaseOrderSearch
    navigate: (args: { search: (prev: PurchaseOrderSearch) => PurchaseOrderSearch; replace?: boolean }) => void
    defaultColumnOrder: string[]
}

// Stable defaults outside component scope
const STABLE_SORTING: SortingState = []
const STABLE_VISIBILITY: VisibilityState = {}
const tableLogger = createLogger('purchase-order-table')


/**
 * Hook for managing Purchase Order Table state and instance.
 * Purely reactive to URL changes.
 */
export function usePurchaseOrderTable({
    tableId,
    searchParams,
    navigate,
    defaultColumnOrder
}: UsePurchaseOrderTableProps) {
    const setSorting = useSetSortingAction()
    const setVisibility = useSetVisibilityAction()
    const setOrder = useSetOrderAction()
    const setPagination = useSetPaginationAction()
    const setColumnFilters = useSetColumnFiltersAction()
    const clearAllFilters = useClearAllFiltersAction()

    // URL-derived baseline
    const urlSorting = searchParams.sorting || STABLE_SORTING
    const urlVisibility = searchParams.columnVisibility || STABLE_VISIBILITY
    const urlColumnOrder = (searchParams.columnOrder && searchParams.columnOrder.length > 0)
        ? searchParams.columnOrder
        : defaultColumnOrder
    const urlColumnFilters = useMemo(
        () => normalizeColumnFilters(searchParams.columnFilters),
        [searchParams.columnFilters],
    )
    const urlPagination = useMemo(() => ({
        pageIndex: (searchParams.page ?? 1) - 1,
        pageSize: searchParams.limit ?? 10,
    }), [searchParams.page, searchParams.limit])


    const sorting = urlSorting
    const columnVisibility = urlVisibility
    const columnOrder = urlColumnOrder
    const columnFilters = urlColumnFilters
    const pagination = { pageIndex: urlPagination.pageIndex, pageSize: urlPagination.pageSize }


    useEffect(() => {
        tableLogger.debug({ tableId, source: 'url', sorting: urlSorting }, 'sort_state_applied')
        setSorting(tableId, urlSorting)
    }, [tableId, urlSorting, setSorting])

    useEffect(() => {
        setVisibility(tableId, urlVisibility)
    }, [tableId, urlVisibility, setVisibility])

    useEffect(() => {
        setOrder(tableId, urlColumnOrder)
    }, [tableId, urlColumnOrder, setOrder])

    useEffect(() => {
        setPagination(tableId, { pageIndex: urlPagination.pageIndex, pageSize: urlPagination.pageSize })
    }, [tableId, urlPagination, setPagination])

    useEffect(() => {
        setColumnFilters(tableId, urlColumnFilters)
    }, [tableId, urlColumnFilters, setColumnFilters])

    const columns = useMemo(() => createColumns(), [])

    // 2. Initialize/Update TanStack Table Instance
    const table = useReactTable({
        data: sampleData,
        columns,
        state: {
            sorting,
            columnVisibility,
            columnOrder,
            pagination,
            columnFilters,
        },
        // Handlers: Push state changes back to URL
        onSortingChange: (updater) => {
            const next = typeof updater === 'function' ? updater(sorting) : updater
            tableLogger.debug({ tableId, source: 'ui', prevSorting: sorting, nextSorting: next }, 'sort_change')
            setSorting(tableId, next)
            navigate({ search: (prev: PurchaseOrderSearch) => ({ ...prev, sorting: next.length > 0 ? next : [] }), replace: true })
        },
        onColumnVisibilityChange: (updater) => {
            const next = typeof updater === 'function' ? updater(columnVisibility) : updater
            setVisibility(tableId, next)
            navigate({ search: (prev: PurchaseOrderSearch) => ({ ...prev, columnVisibility: next }), replace: true })
        },
        onColumnOrderChange: (updater) => {
            const next = typeof updater === 'function' ? updater(columnOrder) : updater
            setOrder(tableId, next)
            navigate({ search: (prev: PurchaseOrderSearch) => ({ ...prev, columnOrder: next }), replace: true })
        },
        onPaginationChange: (updater) => {
            const next = typeof updater === 'function' ? updater(pagination) : updater
            setPagination(tableId, { pageIndex: next.pageIndex, pageSize: next.pageSize })
            navigate({
                search: (prev: PurchaseOrderSearch) => ({
                    ...prev,
                    page: Math.max(next.pageIndex + 1, 1),
                    limit: Math.max(next.pageSize, 1),
                }),
                replace: true,
            })
        },
        onColumnFiltersChange: (updater) => {
            const next = typeof updater === 'function' ? updater(columnFilters) : updater
            const normalized = normalizeColumnFilters(next)
            setColumnFilters(tableId, normalized)
            setPagination(tableId, { pageIndex: 0 })
            navigate({
                search: (prev: PurchaseOrderSearch) => ({
                    ...prev,
                    page: 1,
                    columnFilters: normalized.length > 0 ? (normalized as PurchaseOrderSearch['columnFilters']) : [],
                }),
                replace: true,
            })
        },
        // Pipeline: Core -> Filter -> Sort -> Paginate
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        // Core features enabled
        enableSorting: true,
        enableFilters: true,
        manualSorting: false, // Internal sorting
        manualFiltering: false, // Internal filtering
        manualPagination: false, // Internal pagination
        autoResetPageIndex: false, // Controlled by URL
    })

    const handleResetTable = () => {
        navigate({
            search: (prev: PurchaseOrderSearch) => ({
                ...prev,
                page: 1,
                limit: 10,
                columnVisibility: {},
                columnOrder: defaultColumnOrder,
                columnFilters: [],
                sorting: [],
            }),
            replace: true,
        })
        setSorting(tableId, STABLE_SORTING)
        setVisibility(tableId, STABLE_VISIBILITY)
        setOrder(tableId, defaultColumnOrder)
        clearAllFilters(tableId)
        setPagination(tableId, { pageIndex: 0, pageSize: 10 })
    }


    return { table, handleResetTable }
}
