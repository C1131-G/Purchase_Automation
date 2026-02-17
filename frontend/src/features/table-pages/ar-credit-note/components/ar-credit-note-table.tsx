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
import { useEffect, useMemo } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { TablePagination } from '@/components/table/controls/pagination'
import { TableErrorState } from '@/components/table/core/table-error-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/table/core/table-root'
import { TableToolbar } from '@/components/table/core/table-toolbar'
import { normalizeColumnFilters } from '@/components/ui/types/filter-utils'
import { arCreditNoteQueries } from '@/features/table-pages/ar-credit-note/api/ar-credit-note.queries'
import { type ARCreditNoteListItem } from '@/features/table-pages/ar-credit-note/api/ar-credit-note.service'
import { mapSearchToARCreditNoteListParams } from '@/features/table-pages/ar-credit-note/api/ar-credit-note-query.mapper'
import { createARCreditNoteColumns } from '@/features/table-pages/ar-credit-note/components/columns'
import {
  type ARCreditNoteColumnFilter,
  arCreditNoteColumnFilterSchema,
  type ARCreditNoteSearch,
} from '@/features/table-pages/ar-credit-note/schemas/ar-credit-note-search.schema'
import { useClearAllFiltersAction } from '@/store/table/table-filter.store'
import { useSetColumnFiltersAction } from '@/store/table/table-filter.store'
import { useSetOrderAction } from '@/store/table/table-order.store'
import { useSetPaginationAction } from '@/store/table/table-pagination.store'
import { useSetSortingAction } from '@/store/table/table-sorting.store'
import { useSetVisibilityAction } from '@/store/table/table-visibility.store'

// ARCreditNoteTable: Operational grid for AR Credit Note management using SAP B1 Industrial style.
// Bridges TanStack Table logic with custom Sapphire UI and reactive URL synchronization.
const routeApi = getRouteApi('/_layout/sales/ar-credit-note')
const TABLE_ID = 'ar-credit-notes'

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

const toARCreditNoteColumnFilters = (filters: ColumnFiltersState): ARCreditNoteColumnFilter[] => {
  const typedFilters: ARCreditNoteColumnFilter[] = []
  for (const filter of filters) {
    const parsed = arCreditNoteColumnFilterSchema.safeParse(filter)
    if (!parsed.success) continue
    typedFilters.push(parsed.data)
  }
  return typedFilters
}

export function ARCreditNoteTable() {
  const searchParams = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const setSorting = useSetSortingAction()
  const setVisibility = useSetVisibilityAction()
  const setOrder = useSetOrderAction()
  const setPagination = useSetPaginationAction()
  const setColumnFilters = useSetColumnFiltersAction()
  const clearAllFilters = useClearAllFiltersAction()

  const defaultColumnOrder = useMemo(() => {
    return ['DocNum', 'DocDate', 'CardCode', 'CardName', 'DocTotal', 'DocStatus']
  }, [])

  const columns = useMemo(() => createARCreditNoteColumns(), [])

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

  const listParams = useMemo(() => mapSearchToARCreditNoteListParams(searchParams), [searchParams])
  const {
    data: arCreditNoteList,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery(arCreditNoteQueries.list(listParams))
  const queryClient = useQueryClient()

  const rows = arCreditNoteList?.data ?? []
  const totalRows = arCreditNoteList?.total ?? 0
  const totalPages = Math.max(arCreditNoteList?.totalPages ?? 1, 1)
  const showInitialSkeleton = isLoading && !arCreditNoteList

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<ARCreditNoteListItem>({
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
        search: (prev: ARCreditNoteSearch) => ({
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
        search: (prev: ARCreditNoteSearch) => ({
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
        search: (prev: ARCreditNoteSearch) => ({
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
        search: (prev: ARCreditNoteSearch) => ({
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
      const nextSearchColumnFilters = toARCreditNoteColumnFilters(nextFilters)
      navigate({
        search: (prev: ARCreditNoteSearch) => ({
          ...prev,
          page: 1,
          columnFilters: nextSearchColumnFilters,
          DocStatus: undefined,
          DocDateStart: undefined,
          DocDateEnd: undefined,
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
      search: (prev: ARCreditNoteSearch) => ({
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
    setPagination(TABLE_ID, { pageIndex: 0, pageSize: 10, totalRows: 0 })

    navigate({
      search: (prev: ARCreditNoteSearch) => ({
        ...prev,
        page: 1,
        limit: 10,
        columnVisibility: {},
        columnOrder: [...defaultColumnOrder],
        columnFilters: [],
        sorting: [],
        DocStatus: undefined,
        DocDateStart: undefined,
        DocDateEnd: undefined,
      }),
      replace: true,
    })
  }

  if (showInitialSkeleton) return <TableSkeleton />
  if (isError && !arCreditNoteList) {
    return (
      <TableErrorState
        title="AR credit notes unavailable"
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
        breadcrumb={{
          section: 'Sales',
          page: 'AR Credit Notes Table',
          href: '/sales/ar-credit-note',
        }}
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
        onPrefetchPage={(nextPageIndex, nextPageSize) => {
          queryClient.prefetchQuery(
            arCreditNoteQueries.list({
              ...listParams,
              page: nextPageIndex + 1,
              limit: nextPageSize,
            }),
          )
        }}
        onPrefetchPageSize={(nextPageSize) => {
          queryClient.prefetchQuery(
            arCreditNoteQueries.list({
              ...listParams,
              page: 1,
              limit: nextPageSize,
            }),
          )
        }}
      />
    </div>
  )
}
