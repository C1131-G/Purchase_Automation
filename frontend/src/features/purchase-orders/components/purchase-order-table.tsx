import { getRouteApi } from '@tanstack/react-router'
import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'

import { TablePagination } from '@/components/table/controls/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/table/core/table-root'
import { normalizeColumnFilters } from '@/components/ui/types/filter-utils'
import { purchaseOrdersSampleData as sampleData } from '@/features/purchase-orders/api/purchase-orders.api'
import { createColumns } from '@/features/purchase-orders/components/table/columns'
import { TableToolbar } from '@/features/purchase-orders/components/table/toolbar'
import { type PurchaseOrderSearch } from '@/features/purchase-orders/schemas/purchase-order-search.schema'
import { useSetColumnFiltersAction } from '@/store/table/table-filter.store'
import { useClearAllFiltersAction } from '@/store/table/table-filter.store'
import { useSetOrderAction } from '@/store/table/table-order.store'
import { useSetPaginationAction } from '@/store/table/table-pagination.store'
import { useSetSortingAction } from '@/store/table/table-sorting.store'
import { useSetVisibilityAction } from '@/store/table/table-visibility.store'

/**
 * PurchaseOrderTable: Operational grid for procurement management.
 * 
 * DESIGN: SAP B1 Industrial style with integrated toolbar/pagination.
 * ARCHITECTURE: Headless (TanStack Table) logic combined with custom Sapphire UI.
 * DATA: Bridges normalized URL search params with reactive Zustand UI mirrors.
 * SYNC: Every state change (Filter/Sort/Page) triggers a URL navigation for deep-linking.
 */
const routeApi = getRouteApi('/_layout/purchase/orders')
const TABLE_ID = 'purchase-orders'

const cloneSorting = (sorting: SortingState): SortingState =>
  sorting.map((item) => ({ id: item.id, desc: item.desc }))

const cloneVisibility = (visibility: VisibilityState): VisibilityState => ({ ...visibility })
const normalizeVisibility = (visibility: VisibilityState): VisibilityState => {
  return Object.fromEntries(Object.entries(visibility).filter(([, visible]) => visible === false))
}

const cloneOrder = (order: string[]): string[] => [...order]

const cloneFilters = (filters: ColumnFiltersState): ColumnFiltersState =>
  filters.map((filter) => ({
    id: filter.id,
    value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
  }))

export function PurchaseOrderTable() {
  const searchParams = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const setSorting = useSetSortingAction()
  const setVisibility = useSetVisibilityAction()
  const setOrder = useSetOrderAction()
  const setPagination = useSetPaginationAction()
  const setColumnFilters = useSetColumnFiltersAction()
  const clearAllFilters = useClearAllFiltersAction()

  const defaultColumnOrder = useMemo(() => {
    return [
      'DocEntry',
      'DocNum',
      'DocDate',
      'CardCode',
      'CardName',
      'DocTotal',
      'DocStatus',
      'Canceled',
    ]
  }, [])

  const columns = useMemo(() => createColumns(), [])

  const sorting = useMemo<SortingState>(
    () => cloneSorting(searchParams.sorting ?? []),
    [searchParams.sorting],
  )

  const columnVisibility = useMemo<VisibilityState>(
    () => cloneVisibility(searchParams.columnVisibility ?? {}),
    [searchParams.columnVisibility],
  )

  const columnOrder = useMemo<string[]>(
    () =>
      cloneOrder(searchParams.columnOrder?.length ? searchParams.columnOrder : defaultColumnOrder),
    [searchParams.columnOrder, defaultColumnOrder],
  )

  const columnFilters = useMemo<ColumnFiltersState>(
    () => cloneFilters(normalizeColumnFilters(searchParams.columnFilters)),
    [searchParams.columnFilters],
  )

  const pagination = useMemo(
    () => ({
      // INDEXING: Translate human-friendly 1-indexed URL `page` to developer-friendly 0-indexed state
      pageIndex: Math.max((searchParams.page ?? 1) - 1, 0),
      pageSize: Math.max(searchParams.limit ?? 10, 1),
    }),
    [searchParams.page, searchParams.limit],
  )

  const tableState = useMemo(
    () => ({
      sorting,
      columnVisibility,
      columnOrder,
      pagination,
      columnFilters,
    }),
    [sorting, columnVisibility, columnOrder, pagination, columnFilters],
  )

  const table = useReactTable({
    data: sampleData,
    columns,
    state: tableState,
    meta: { tableId: TABLE_ID },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      const nextSorting = cloneSorting(next)
      setSorting(TABLE_ID, nextSorting)
      navigate({
        search: (prev: PurchaseOrderSearch) => ({
          ...prev,
          sorting: nextSorting.length > 0 ? nextSorting : [],
        }),
        replace: true,
      })
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibility) : updater
      const nextVisibility = normalizeVisibility(cloneVisibility(next))
      setVisibility(TABLE_ID, nextVisibility)
      navigate({
        search: (prev: PurchaseOrderSearch) => ({
          ...prev,
          columnVisibility: { ...nextVisibility },
        }),
        replace: true,
      })
    },
    onColumnOrderChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnOrder) : updater
      setOrder(TABLE_ID, cloneOrder(next))
      navigate({
        search: (prev: PurchaseOrderSearch) => ({
          ...prev,
          columnOrder: [...next],
        }),
        replace: true,
      })
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      const nextPagination = {
        pageIndex: Math.max(next.pageIndex, 0),
        pageSize: Math.max(next.pageSize, 1),
      }
      setPagination(TABLE_ID, nextPagination)
      navigate({
        search: (prev: PurchaseOrderSearch) => ({
          ...prev,
          page: nextPagination.pageIndex + 1,
          limit: nextPagination.pageSize,
        }),
        replace: true,
      })
    },
    onColumnFiltersChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnFilters) : updater
      const normalized = normalizeColumnFilters(next)
      const nextFilters = cloneFilters(normalized)
      setColumnFilters(TABLE_ID, nextFilters)
      setPagination(TABLE_ID, { pageIndex: 0 })
      navigate({
        search: (prev: PurchaseOrderSearch) => ({
          ...prev,
          page: 1,
          columnFilters: nextFilters as PurchaseOrderSearch['columnFilters'],
        }),
        replace: true,
      })
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSorting: true,
    enableFilters: true,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
    autoResetPageIndex: false,
  })

  const filteredTotalRows = table.getFilteredRowModel().rows.length
  const effectivePageSize = Math.max(pagination.pageSize, 1)
  const effectivePageCount = Math.max(Math.ceil(filteredTotalRows / effectivePageSize), 1)
  const maxPageIndex = Math.max(effectivePageCount - 1, 0)

  useEffect(() => {
    setColumnFilters(TABLE_ID, columnFilters)
  }, [setColumnFilters, columnFilters])

  useEffect(() => {
    setPagination(TABLE_ID, {
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      totalRows: filteredTotalRows,
    })
  }, [setPagination, pagination.pageIndex, pagination.pageSize, filteredTotalRows])

  useEffect(() => {
    if (pagination.pageIndex <= maxPageIndex) return

    const clampedPageIndex = maxPageIndex
    setPagination(TABLE_ID, {
      pageIndex: clampedPageIndex,
      totalRows: filteredTotalRows,
    })
    navigate({
      search: (prev: PurchaseOrderSearch) => ({
        ...prev,
        page: clampedPageIndex + 1,
      }),
      replace: true,
    })
  }, [pagination.pageIndex, maxPageIndex, filteredTotalRows, setPagination, navigate])

  const handleResetTable = () => {
    setSorting(TABLE_ID, [])
    setVisibility(TABLE_ID, {})
    setOrder(TABLE_ID, [...defaultColumnOrder])
    clearAllFilters(TABLE_ID)
    setPagination(TABLE_ID, { pageIndex: 0, pageSize: 10, totalRows: sampleData.length })

    navigate({
      search: (prev: PurchaseOrderSearch) => ({
        ...prev,
        page: 1,
        limit: 10,
        columnVisibility: {},
        columnOrder: [...defaultColumnOrder],
        columnFilters: [],
        sorting: [],
      }),
      replace: true,
    })
  }

  return (
    <div className="h-full w-full overflow-hidden bg-white flex flex-col">
      <TableToolbar tableId={TABLE_ID} table={table} onReset={handleResetTable} />

      <div className="flex-1 overflow-auto w-full">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="align-top py-3 whitespace-nowrap">
                    <div className="flex items-center justify-start gap-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        tableId={TABLE_ID}
        table={table}
        totalRows={filteredTotalRows}
      />
    </div>
  )
}
