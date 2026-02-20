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
import { outgoingPaymentQueries } from '@/features/table-pages/outgoing-payment/api/outgoing-payment.queries'
import { type OutgoingPaymentListItem } from '@/features/table-pages/outgoing-payment/api/outgoing-payment.service'
import { mapSearchToOutgoingPaymentListParams } from '@/features/table-pages/outgoing-payment/api/outgoing-payment-query.mapper'
import { createOutgoingPaymentColumns } from '@/features/table-pages/outgoing-payment/components/columns'
import {
  type OutgoingPaymentColumnFilter,
  outgoingPaymentColumnFilterSchema,
  type OutgoingPaymentSearch,
} from '@/features/table-pages/outgoing-payment/schemas/outgoing-payment-search.schema'
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

// OutgoingPaymentTable: Operational grid for Outgoing Payment management using SAP B1 Industrial style.
// Bridges TanStack Table logic with custom Sapphire UI and reactive URL synchronization.
const routeApi = getRouteApi('/_layout/purchase/outgoing-payment')
const TABLE_ID = 'outgoing-payments'

const cloneSorting = (sorting: SortingState): SortingState =>
  sorting.map((item) => ({ id: item.id, desc: item.desc }))

const cloneVisibility = (visibility: VisibilityState): VisibilityState => ({ ...visibility })
const normalizeVisibility = (visibility: VisibilityState): VisibilityState =>
  Object.fromEntries(Object.entries(visibility).filter(([, visible]) => visible === false))

const cloneOrder = (order: string[]): string[] => [...order]

const cloneFilters = (filters: ColumnFiltersState): ColumnFiltersState =>
  filters.map((filter) => ({
    id: filter.id,
    value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
  }))

const toOutgoingPaymentColumnFilters = (
  filters: ColumnFiltersState,
): OutgoingPaymentColumnFilter[] => {
  const typedFilters: OutgoingPaymentColumnFilter[] = []
  for (const filter of filters) {
    const parsed = outgoingPaymentColumnFilterSchema.safeParse(filter)
    if (!parsed.success) continue
    typedFilters.push(parsed.data)
  }
  return typedFilters
}

export function OutgoingPaymentTable() {
  const searchParams = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const setSorting = useSetSortingAction()
  const setVisibility = useSetVisibilityAction()
  const setOrder = useSetOrderAction()
  const setPagination = useSetPaginationAction()
  const setColumnFilters = useSetColumnFiltersAction()
  const clearAllFilters = useClearAllFiltersAction()

  const defaultColumnOrder = useMemo(
    () => ['DocNum', 'DocDate', 'CardCode', 'CardName', 'DocTotal'],
    [],
  )

  const columns = useMemo(() => createOutgoingPaymentColumns(), [])
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
    () => ({ sorting, columnVisibility, columnOrder, pagination, columnFilters }),
    [sorting, columnVisibility, columnOrder, pagination, columnFilters],
  )

  const listParams = useMemo(
    () => mapSearchToOutgoingPaymentListParams(searchParams),
    [searchParams],
  )
  const {
    data: paymentList,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery(outgoingPaymentQueries.list(listParams))
  const queryClient = useQueryClient()

  // Vendors lookup for filter suggestions and popup
  const vendorsQuery = useQuery(createSharedQueries.vendors())
  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data])

  const docNumSuggestionsQuery = useQuery(outgoingPaymentQueries.docNumSuggestions())
  const docNumSuggestions = useMemo<LookupItem[]>(
    () => docNumSuggestionsQuery.data?.data ?? [],
    [docNumSuggestionsQuery.data],
  )

  // Lookup popup state
  const [lookupPopupOpen, setLookupPopupOpen] = useState(false)
  const [lookupColumnId, setLookupColumnId] = useState<string>('')
  const [lookupSearch, setLookupSearch] = useState('')

  const rows = paymentList?.data ?? []
  const totalRows = paymentList?.total ?? 0
  const totalPages = Math.max(paymentList?.totalPages ?? 1, 1)
  const showInitialSkeleton = isLoading && !paymentList

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<OutgoingPaymentListItem>({
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
        search: (prev: OutgoingPaymentSearch) => ({
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
        search: (prev: OutgoingPaymentSearch) => ({
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
        search: (prev: OutgoingPaymentSearch) => ({ ...prev, columnOrder: [...next] }),
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
        search: (prev: OutgoingPaymentSearch) => ({
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
      const nextSearchColumnFilters = toOutgoingPaymentColumnFilters(nextFilters)
      navigate({
        search: (prev: OutgoingPaymentSearch) => ({
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
      search: (prev: OutgoingPaymentSearch) => ({ ...prev, page: clampedPageIndex + 1 }),
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
      search: (prev: OutgoingPaymentSearch) => ({
        ...prev,
        page: 1,
        limit: 10,
        columnVisibility: {},
        columnOrder: [...defaultColumnOrder],
        columnFilters: [],
        sorting: [],
        DocDateStart: undefined,
        DocDateEnd: undefined,
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
        outgoingPaymentQueries.list({
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
        outgoingPaymentQueries.list({
          ...listParams,
          page: 1,
          limit: nextPageSize,
        }),
      )
    },
    [queryClient, listParams],
  )

  if (showInitialSkeleton) return <TableSkeleton />
  if (isError && !paymentList) {
    return (
      <TableErrorState
        title="Outgoing payments unavailable"
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
        isFetching={isFetching}
        createLink="/purchase/create-outgoing-payment"
        breadcrumb={{
          section: 'Purchase',
          page: 'Outgoing Payments',
          href: '/purchase/outgoing-payment',
        }}
        lookupSuggestions={vendors}
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
              ? 'vendor-code'
              : 'vendor-name'
        }
        search={lookupSearch}
        results={lookupColumnId === 'DocNum' ? docNumSuggestions : vendors}
        loading={
          lookupColumnId === 'DocNum' ? docNumSuggestionsQuery.isLoading : vendorsQuery.isLoading
        }
        error={
          lookupColumnId === 'DocNum'
            ? docNumSuggestionsQuery.isError && docNumSuggestions.length === 0
              ? 'Failed to load document numbers'
              : null
            : vendorsQuery.isError
              ? 'Failed to load vendors'
              : null
        }
        title={
          lookupColumnId === 'DocNum'
            ? 'Search Doc Number'
            : lookupColumnId === 'CardCode'
              ? 'Search Vendor Code'
              : 'Search Vendor Name'
        }
        searchPlaceholder={
          lookupColumnId === 'DocNum' ? 'Search document number' : 'Search vendor code or name'
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
