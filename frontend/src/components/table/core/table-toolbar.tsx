import { Link } from '@tanstack/react-router'
import { type Table } from '@tanstack/react-table'
import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'

import { TableViewOptions } from '@/components/table/controls/view-options'
import { TableFilterOptions } from '@/components/table/filters/filter-options'
import { TableSearch } from '@/components/table/filters/table-search'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { hasFilterValue } from '@/components/ui/types/filter-utils'
import { useSetActiveFilterAction, useTableActiveFilter } from '@/store/table/table-filter.store'

type TableToolbarProps<TData> = {
  tableId: string
  table: Table<TData>
  onReset: () => void
  isFetching?: boolean
  createLink?: string
  createLabel?: string
  breadcrumb?: {
    section: string
    page: string
    href: string
  }
}

export function TableToolbar<TData>({
  tableId,
  table,
  onReset,
  isFetching = false,
  createLink = '/purchase/create-order',
  createLabel = 'Create',
  breadcrumb,
}: TableToolbarProps<TData>) {
  const activeFilterId = useTableActiveFilter(tableId)
  const setActiveFilter = useSetActiveFilterAction()
  const hasRestoredInitialFilter = useRef(false)
  const tableColumnFilters = table.getState().columnFilters
  const filterableColumnIds = useMemo(
    () =>
      table
        .getAllLeafColumns()
        .filter((column) => column.getCanFilter())
        .map((column) => column.id),
    [table],
  )
  const lastAppliedFilterId = useMemo(() => {
    const applied = tableColumnFilters.filter(
      (filter) => filterableColumnIds.includes(filter.id) && hasFilterValue(filter.value),
    )
    const last = applied[applied.length - 1]
    return last?.id ?? null
  }, [tableColumnFilters, filterableColumnIds])
  const hasActiveFilters = useMemo(
    () => tableColumnFilters.some((filter) => hasFilterValue(filter.value)),
    [tableColumnFilters],
  )
  const hasSorting = table.getState().sorting.length > 0
  const statusLabel = useMemo(() => {
    if (!isFetching) return null
    // Filtering should take precedence whenever active filters exist.
    if (hasActiveFilters) return 'Filtering'
    if (hasSorting) return 'Sorting'
    return 'Refreshing'
  }, [isFetching, hasSorting, hasActiveFilters])

  useEffect(() => {
    if (hasRestoredInitialFilter.current) return
    if (activeFilterId) {
      hasRestoredInitialFilter.current = true
      return
    }
    if (lastAppliedFilterId) {
      setActiveFilter(tableId, lastAppliedFilterId)
    }
    hasRestoredInitialFilter.current = true
  }, [tableId, activeFilterId, lastAppliedFilterId, setActiveFilter])

  useEffect(() => {
    if (!activeFilterId) return
    if (!filterableColumnIds.includes(activeFilterId)) {
      setActiveFilter(tableId, null)
    }
  }, [tableId, activeFilterId, filterableColumnIds, setActiveFilter])

  return (
    <div className="border-b border-zinc-100 bg-white">
      {breadcrumb ? (
        <div className="px-6 pt-3 pb-1">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)] backdrop-blur-sm">
            <span>{breadcrumb.section}</span>
            <span className="text-zinc-300">›</span>
            <Link to={breadcrumb.href} className="text-blue-600 hover:text-blue-700">
              {breadcrumb.page}
            </Link>
          </div>
        </div>
      ) : null}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex flex-1 items-center gap-2">
          <SidebarTrigger className="-ml-3" />
          <Separator orientation="vertical" className="mx-2 h-6" />
          <TableSearch table={table} activeFilterId={activeFilterId} />
        </div>
        <div className="flex items-center gap-2">
          {statusLabel ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-[11px] font-semibold text-blue-700 shadow-sm">
              <span className="size-1.5 rounded-full bg-blue-600" />
              {statusLabel}
            </span>
          ) : null}
          <TableFilterOptions tableId={tableId} table={table} />
          <Separator orientation="vertical" className="h-6" />
          <TableViewOptions tableId={tableId} table={table} onReset={onReset} />
          <Separator orientation="vertical" className="h-6" />
          <Link
            to={createLink}
            preload="intent"
            viewTransition
            className="group flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold tracking-normal text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 focus:outline-none focus:ring-0 active:scale-[0.98]"
          >
            {createLabel}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}
