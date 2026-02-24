import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, useRouter } from '@tanstack/react-router'
import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { normalizeColumnFilters } from '@/components/types/filter-utils'
import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { arInvoiceQueries } from '@/features/table-pages/ar-invoices/api/ar-invoice.queries'
import { type ARInvoiceListItem } from '@/features/table-pages/ar-invoices/api/ar-invoice.service'
import { mapSearchToARInvoiceListParams } from '@/features/table-pages/ar-invoices/api/ar-invoice-query.mapper'
import { createARInvoiceColumns } from '@/features/table-pages/ar-invoices/components/ar-invoice-columns'
import { ARInvoiceLookupLayer } from '@/features/table-pages/ar-invoices/components/ar-invoice-lookup-layer'
import {
  type ARInvoiceColumnFilter,
  arInvoiceColumnFilterSchema,
  type ARInvoiceSearch,
} from '@/features/table-pages/ar-invoices/schemas/ar-invoice-search.schema'
import { TablePagination } from '@/features/table-pages/table-shared/components/controls/pagination'
import { TableErrorState } from '@/features/table-pages/table-shared/components/core/table-error-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/features/table-pages/table-shared/components/core/table-root'
import { useTablePrefetch } from '@/features/table-pages/table-shared/hooks/use-table-prefetch'
import {
  type TableFetchAction,
  useTableToast,
} from '@/features/table-pages/table-shared/hooks/use-table-toast'
import {
  cloneFilters,
  cloneOrder,
  cloneSorting,
  cloneVisibility,
  normalizeVisibility,
} from '@/features/table-pages/table-shared/utils/table-state.utils'
import { useSetColumnFiltersAction } from '@/store/table/table-filter.store'
import { useClearAllFiltersAction } from '@/store/table/table-filter.store'
import { useSetOrderAction } from '@/store/table/table-order.store'
import { useSetPaginationAction } from '@/store/table/table-pagination.store'
import { useSetSortingAction } from '@/store/table/table-sorting.store'
import { useSetVisibilityAction } from '@/store/table/table-visibility.store'

const routeApi = getRouteApi('/_layout/sales/ar-invoice')
const TABLE_ID = 'ar-invoices'
const DEFAULT_COLUMN_ORDER = [
  'DocNum',
  'DocDate',
  'CardCode',
  'CardName',
  'DocTotal',
  'NumAtCard',
  'DocStatus',
]

const toARInvoiceColumnFilters = (filters: ColumnFiltersState): ARInvoiceColumnFilter[] => {
  const typedFilters: ARInvoiceColumnFilter[] = []
  for (const filter of filters) {
    const parsed = arInvoiceColumnFilterSchema.safeParse(filter)
    if (!parsed.success) continue
    typedFilters.push(parsed.data)
  }
  return typedFilters
}

// ARInvoiceTable: Accounts Receivable invoice listing orchestrator.
// Employs a URL-first entry pattern to maintain state across reloads and navigation.
export function ARInvoiceTable() {
  const searchParams = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const router = useRouter()
  const setSorting = useSetSortingAction()
  const setVisibility = useSetVisibilityAction()
  const setOrder = useSetOrderAction()
  const setPagination = useSetPaginationAction()
  const setColumnFilters = useSetColumnFiltersAction()
  const clearAllFilters = useClearAllFiltersAction()
  const queryClient = useQueryClient()

  /** Tracks which user action last triggered a fetch for action-specific toasts. */
  const lastActionRef = useRef<TableFetchAction>('fetching')
  const docNumPrefetchRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const prefetchEditRouteData = useCallback(
    (docNum: string) => {
      const normalizedDocNum = docNum.trim()
      if (!normalizedDocNum) return
      if (docNumPrefetchRef.current.has(normalizedDocNum)) return
      docNumPrefetchRef.current.add(normalizedDocNum)

      void queryClient
        .fetchQuery(arInvoiceQueries.detailByDocNum(normalizedDocNum))
        .then(() => {
          void router.preloadRoute({
            to: '/sales/ar-invoice/$docNum/edit',
            params: { docNum: normalizedDocNum },
          } as never)
          void Promise.allSettled([
            queryClient.prefetchQuery(createSharedQueries.customers()),
            queryClient.prefetchQuery(createSharedQueries.warehouses()),
            queryClient.prefetchQuery(createSharedQueries.salesEmployees()),
          ])
        })
        .catch(() => {
          docNumPrefetchRef.current.delete(normalizedDocNum)
        })
    },
    [queryClient, router],
  )

  const columns = useMemo(
    () =>
      createARInvoiceColumns({
        onDocNumHover: (docNum) => {
          const normalized = String(docNum).trim()
          if (!normalized) return
          prefetchEditRouteData(normalized)
        },
        onDocNumDoubleClick: (docNum) => {
          const normalized = String(docNum).trim()
          if (!normalized) return
          prefetchEditRouteData(normalized)
          void navigate({
            to: '/sales/ar-invoice/$docNum/edit',
            params: { docNum: normalized },
            viewTransition: true,
          } as never)
        },
      }),
    [navigate, prefetchEditRouteData],
  )
  const columnIds = useMemo(
    () =>
      columns
        .map((column) =>
          column.id ? column.id : typeof column.accessorKey === 'string' ? column.accessorKey : '',
        )
        .filter(Boolean),
    [columns],
  )

  const sorting = useMemo<SortingState>(
    () => cloneSorting(searchParams.sorting ?? []),
    [searchParams.sorting],
  )

  const columnVisibility = useMemo<VisibilityState>(
    () => cloneVisibility(searchParams.columnVisibility ?? {}),
    [searchParams.columnVisibility],
  )

  const columnOrder = useMemo<string[]>(() => {
    const base =
      searchParams.columnOrder?.length && searchParams.columnOrder.some(Boolean)
        ? searchParams.columnOrder
        : DEFAULT_COLUMN_ORDER
    const filtered = base.filter((id) => columnIds.includes(id))
    return cloneOrder(filtered.length ? filtered : DEFAULT_COLUMN_ORDER)
  }, [searchParams.columnOrder, columnIds])

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

  const listParams = useMemo(() => mapSearchToARInvoiceListParams(searchParams), [searchParams])

  // Data Fetching: Reactive query that re-triggers on URL search parameter changes.
  const {
    data: arInvoiceList,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery(arInvoiceQueries.list(listParams))

  const rows = useMemo(() => arInvoiceList?.data ?? [], [arInvoiceList?.data])
  const totalRows = arInvoiceList?.total ?? 0
  const totalPages = Math.max(arInvoiceList?.totalPages ?? 1, 1)
  const showInitialSkeleton = isLoading && !arInvoiceList

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<ARInvoiceListItem>({
    data: rows,
    columns,
    pageCount: totalPages,
    state: tableState,
    meta: { tableId: TABLE_ID },
    onSortingChange: (updater) => {
      lastActionRef.current = 'sorting'
      const next = typeof updater === 'function' ? updater(sorting) : updater
      const nextSorting = cloneSorting(next)
      setSorting(TABLE_ID, nextSorting)
      navigate({
        search: (prev: ARInvoiceSearch) => ({
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
        search: (prev: ARInvoiceSearch) => ({
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
        search: (prev: ARInvoiceSearch) => ({ ...prev, columnOrder: [...next] }),
        replace: true,
      })
    },
    onPaginationChange: (updater) => {
      lastActionRef.current = 'paginating'
      const next = typeof updater === 'function' ? updater(pagination) : updater
      const nextPagination = {
        pageIndex: Math.max(next.pageIndex, 0),
        pageSize: Math.max(next.pageSize, 1),
      }
      setPagination(TABLE_ID, nextPagination)
      navigate({
        search: (prev: ARInvoiceSearch) => ({
          ...prev,
          page: nextPagination.pageIndex + 1,
          limit: nextPagination.pageSize,
        }),
        replace: true,
      })
    },
    onColumnFiltersChange: (updater) => {
      lastActionRef.current = 'filtering'
      const next = typeof updater === 'function' ? updater(columnFilters) : updater
      const normalized = normalizeColumnFilters(next)
      const nextFilters = cloneFilters(normalized)
      setColumnFilters(TABLE_ID, nextFilters)
      setPagination(TABLE_ID, { pageIndex: 0 })
      const nextSearchColumnFilters = toARInvoiceColumnFilters(nextFilters)
      navigate({
        search: (prev: ARInvoiceSearch) => ({
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

  // State Coordination: Bridges the gap between the headless table engine and application state.
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
      search: (prev: ARInvoiceSearch) => ({ ...prev, page: clampedPageIndex + 1 }),
      replace: true,
    })
  }, [pagination.pageIndex, maxPageIndex, filteredTotalRows, setPagination, navigate])

  // Aggressive Background Prefetching (Shared Global Hook)
  const getQueryOptions = useCallback(
    (params: { page: number; limit: number }) =>
      arInvoiceQueries.list({ ...listParams, ...params }),
    [listParams],
  )

  const { prefetchPage } = useTablePrefetch({
    queryClient,
    hasData: !!arInvoiceList,
    pagination,
    maxPageIndex,
    getQueryOptions,
  })

  useTableToast({
    isFetching,
    hasData: !!arInvoiceList,
    action: lastActionRef.current,
  })

  const handleResetTable = useCallback(() => {
    setSorting(TABLE_ID, [])
    setVisibility(TABLE_ID, {})
    setOrder(TABLE_ID, [...DEFAULT_COLUMN_ORDER])
    clearAllFilters(TABLE_ID)
    setPagination(TABLE_ID, { pageIndex: 0, pageSize: 10, totalRows: 0 })

    navigate({
      search: (prev: ARInvoiceSearch) => ({
        ...prev,
        page: 1,
        limit: 10,
        columnVisibility: {},
        columnOrder: [...DEFAULT_COLUMN_ORDER],
        columnFilters: [],
        sorting: [],
        DocTotalOperator: undefined,
        DocTotal: undefined,
      }),
      replace: true,
    })
  }, [setSorting, setVisibility, setOrder, clearAllFilters, setPagination, navigate])

  const handleCreateClickPrefetch = useCallback(() => {
    void Promise.allSettled([
      queryClient.prefetchQuery(createSharedQueries.customers()),
      queryClient.prefetchQuery(createSharedQueries.warehouses()),
      queryClient.prefetchQuery(createSharedQueries.salesEmployees()),
    ])
  }, [queryClient])

  if (showInitialSkeleton) {
    return <TableSkeleton />
  }

  if (isError && !arInvoiceList) {
    return (
      <TableErrorState
        title="AR invoices unavailable"
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="h-full w-full overflow-hidden bg-white flex flex-col">
      <ARInvoiceLookupLayer
        tableId={TABLE_ID}
        table={table}
        onReset={handleResetTable}
        onCreateClick={handleCreateClickPrefetch}
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
        onPrefetchPage={prefetchPage}
        onPrefetchPageSize={(pageSize) => prefetchPage(0, pageSize)}
      />
    </div>
  )
}
