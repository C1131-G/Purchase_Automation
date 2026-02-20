import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { LookupPopup } from '@/components/lookup/lookup-popup'
import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { normalizeColumnFilters } from '@/components/types/filter-utils'
import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { salesOrderQueries } from '@/features/table-pages/sales-orders/api/sales-order.queries'
import { type SalesOrderListItem } from '@/features/table-pages/sales-orders/api/sales-order.service'
import { mapSearchToSalesOrderListParams } from '@/features/table-pages/sales-orders/api/sales-order-query.mapper'
import { createSalesOrderColumns } from '@/features/table-pages/sales-orders/components/columns'
import {
  type SalesOrderColumnFilter,
  salesOrderColumnFilterSchema,
  type SalesOrderSearch,
} from '@/features/table-pages/sales-orders/schemas/sales-order-search.schema'
import { TablePagination } from '@/features/table-pages/shared/components/controls/pagination'
import { TableErrorState } from '@/features/table-pages/shared/components/core/table-error-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/features/table-pages/shared/components/core/table-root'
import { TableToolbar } from '@/features/table-pages/shared/components/core/table-toolbar'
import { useClearAllFiltersAction } from '@/store/table/table-filter.store'
import { useSetColumnFiltersAction } from '@/store/table/table-filter.store'
import { useSetOrderAction } from '@/store/table/table-order.store'
import { useSetPaginationAction } from '@/store/table/table-pagination.store'
import { useSetSortingAction } from '@/store/table/table-sorting.store'
import { useSetVisibilityAction } from '@/store/table/table-visibility.store'

// SalesOrderTable: Operational grid for sales management using SAP B1 Industrial style.
// Bridges TanStack Table logic with custom Sapphire UI and reactive URL synchronization.
const routeApi = getRouteApi('/_layout/sales/orders')
const TABLE_ID = 'sales-orders'

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

const toSalesOrderColumnFilters = (filters: ColumnFiltersState): SalesOrderColumnFilter[] => {
  const typedFilters: SalesOrderColumnFilter[] = []
  for (const filter of filters) {
    const parsed = salesOrderColumnFilterSchema.safeParse(filter)
    if (!parsed.success) continue
    typedFilters.push(parsed.data)
  }
  return typedFilters
}

export function SalesOrderTable() {
  const searchParams = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const setSorting = useSetSortingAction()
  const setVisibility = useSetVisibilityAction()
  const setOrder = useSetOrderAction()
  const setPagination = useSetPaginationAction()
  const setColumnFilters = useSetColumnFiltersAction()
  const clearAllFilters = useClearAllFiltersAction()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const defaultColumnOrder = useMemo(() => {
    return ['DocNum', 'DocDate', 'CardCode', 'CardName', 'DocTotal', 'DocStatus']
  }, [])

  const columns = useMemo(() => createSalesOrderColumns(), [])

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

  const listParams = useMemo(() => mapSearchToSalesOrderListParams(searchParams), [searchParams])
  const {
    data: salesOrderList,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery(salesOrderQueries.list(listParams))
  const queryClient = useQueryClient()

  // Customers lookup for filter suggestions and popup
  const customersQuery = useQuery(createSharedQueries.customers())
  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data])

  const docNumSuggestionsQuery = useQuery(salesOrderQueries.docNumSuggestions())
  const docNumSuggestions = useMemo<LookupItem[]>(
    () => docNumSuggestionsQuery.data?.data ?? [],
    [docNumSuggestionsQuery.data],
  )

  // Lookup popup state
  const [lookupPopupOpen, setLookupPopupOpen] = useState(false)
  const [lookupColumnId, setLookupColumnId] = useState<string>('')
  const [lookupSearch, setLookupSearch] = useState('')

  const rows = salesOrderList?.data ?? []
  const totalRows = salesOrderList?.total ?? 0
  const totalPages = Math.max(salesOrderList?.totalPages ?? 1, 1)
  const showInitialSkeleton = isLoading && !salesOrderList

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<SalesOrderListItem>({
    data: rows,
    columns,
    pageCount: totalPages,
    state: tableState,
    meta: { tableId: TABLE_ID },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      const nextSorting = cloneSorting(next)
      setSorting(TABLE_ID, nextSorting)
      navigate({
        search: (prev: SalesOrderSearch) => ({
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
        search: (prev: SalesOrderSearch) => ({
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
        search: (prev: SalesOrderSearch) => ({
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
        search: (prev: SalesOrderSearch) => ({
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
      const nextSearchColumnFilters = toSalesOrderColumnFilters(nextFilters)
      navigate({
        search: (prev: SalesOrderSearch) => ({
          ...prev,
          page: 1,
          columnFilters: nextSearchColumnFilters,
          DocTotalOperator: undefined,
          DocTotal: undefined,
        }),
        replace: true,
      })
    },
    getCoreRowModel: getCoreRowModel(),
    enableSorting: true,
    enableFilters: true,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    sortDescFirst: false,
    enableSortingRemoval: true,
    autoResetPageIndex: false,
  })

  const filteredTotalRows = totalRows
  const effectivePageSize = Math.max(pagination.pageSize, 1)
  const effectivePageCount = Math.max(
    totalPages,
    Math.ceil(filteredTotalRows / effectivePageSize),
    1,
  )
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
    setPagination(TABLE_ID, { pageIndex: clampedPageIndex, totalRows: filteredTotalRows })
    navigate({
      search: (prev: SalesOrderSearch) => ({
        ...prev,
        page: clampedPageIndex + 1,
      }),
      replace: true,
    })
  }, [pagination.pageIndex, maxPageIndex, filteredTotalRows, setPagination, navigate])

  const handleResetTable = useCallback(() => {
    setSorting(TABLE_ID, [])
    setVisibility(TABLE_ID, {})
    setOrder(TABLE_ID, [...defaultColumnOrder])
    clearAllFilters(TABLE_ID)
    setPagination(TABLE_ID, { pageIndex: 0, pageSize: 10, totalRows: 0 })

    navigate({
      search: (prev: SalesOrderSearch) => ({
        ...prev,
        page: 1,
        limit: 10,
        columnVisibility: {},
        columnOrder: [...defaultColumnOrder],
        columnFilters: [],
        sorting: [],
        DocTotalOperator: undefined,
        DocTotal: undefined,
      }),
      replace: true,
    })
  }, [
    setSorting,
    setVisibility,
    setOrder,
    defaultColumnOrder,
    clearAllFilters,
    setPagination,
    navigate,
  ])

  const handleLookupPopupOpen = useCallback((columnId: string) => {
    if (columnId !== 'CardCode' && columnId !== 'CardName' && columnId !== 'DocNum') return
    setLookupColumnId(columnId)
    setLookupSearch('')
    setLookupPopupOpen(true)
  }, [])

  const handleLookupSelect = useCallback(
    (item: LookupItem) => {
      const column = table.getColumn(lookupColumnId)
      if (column) {
        const value =
          lookupColumnId === 'CardCode' || lookupColumnId === 'DocNum' ? item.code : item.name
        column.setFilterValue(value)
      }
      setLookupPopupOpen(false)
    },
    [lookupColumnId, table],
  )

  const handlePrefetchPage = useCallback(
    (nextPageIndex: number, nextPageSize: number) => {
      queryClient.prefetchQuery(
        salesOrderQueries.list({
          ...listParams,
          page: nextPageIndex + 1,
          limit: nextPageSize,
        }),
      )
    },
    [queryClient, listParams],
  )

  const handlePrefetchPageSize = useCallback(
    (nextPageSize: number) => {
      queryClient.prefetchQuery(
        salesOrderQueries.list({
          ...listParams,
          page: 1,
          limit: nextPageSize,
        }),
      )
    },
    [queryClient, listParams],
  )

  const handleCreateClickPrefetch = useCallback(() => {
    void Promise.allSettled([
      queryClient.prefetchQuery(createSharedQueries.warehouses()),
      queryClient.prefetchQuery(createSharedQueries.salesEmployees()),
    ])
  }, [queryClient])

  if (showInitialSkeleton) return <TableSkeleton />
  if (isError && !salesOrderList) {
    return (
      <TableErrorState
        title="Sales orders unavailable"
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="h-full w-full overflow-hidden bg-white flex flex-col">
      <TableToolbar
        tableId={TABLE_ID}
        table={table}
        onReset={handleResetTable}
        onCreateClick={handleCreateClickPrefetch}
        isFetching={isFetching}
        createLink="/sales/create-order"
        breadcrumb={{ section: 'Sales', page: 'Sales Orders', href: '/sales/orders' }}
        lookupSuggestions={customers}
        docNumSuggestions={docNumSuggestions}
        enableDocNumPopup
        onLookupPopupOpen={handleLookupPopupOpen}
      />
      <LookupPopup
        open={lookupPopupOpen}
        mode={
          lookupColumnId === 'DocNum'
            ? undefined
            : lookupColumnId === 'CardCode'
              ? 'customer-code'
              : 'customer-name'
        }
        search={lookupSearch}
        results={lookupColumnId === 'DocNum' ? docNumSuggestions : customers}
        loading={
          lookupColumnId === 'DocNum' ? docNumSuggestionsQuery.isLoading : customersQuery.isLoading
        }
        error={
          lookupColumnId === 'DocNum'
            ? docNumSuggestionsQuery.isError && docNumSuggestions.length === 0
              ? 'Failed to load document numbers'
              : null
            : customersQuery.isError
              ? 'Failed to load customers'
              : null
        }
        title={
          lookupColumnId === 'DocNum'
            ? 'Search Doc Number'
            : lookupColumnId === 'CardCode'
              ? 'Search Customer Code'
              : 'Search Customer Name'
        }
        searchPlaceholder={
          lookupColumnId === 'DocNum' ? 'Search document number' : 'Search customer code or name'
        }
        onSearchChange={setLookupSearch}
        onClose={() => setLookupPopupOpen(false)}
        onSelect={handleLookupSelect}
      />
      <div className="flex-1 overflow-auto w-full px-1.5">
        <Table className="w-full min-w-300">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="align-top py-3 whitespace-nowrap"
                    style={{ width: header.getSize() }}
                  >
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
                    <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
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
        onPrefetchPage={handlePrefetchPage}
        onPrefetchPageSize={handlePrefetchPageSize}
      />
    </div>
  )
}
