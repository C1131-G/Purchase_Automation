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

interface TableToolbarProps<TData> {
  tableId: string
  table: Table<TData>
  onReset: () => void
}

export function TableToolbar<TData>({ tableId, table, onReset }: TableToolbarProps<TData>) {
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
    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-50 bg-white">
      <div className="flex items-center gap-2 flex-1">
        <SidebarTrigger className="-ml-3" />
        <Separator orientation="vertical" className="h-6 mx-2" />
        <TableSearch table={table} activeFilterId={activeFilterId} />
      </div>
      <div className="flex items-center gap-2">
        <TableFilterOptions
          tableId={tableId}
          table={table}
        />
        <Separator orientation="vertical" className="h-6" />
        <TableViewOptions tableId={tableId} table={table} onReset={onReset} />
        <Separator orientation="vertical" className="h-6" />
        <Link
          to="/purchase/create-order"
          viewTransition
          className="flex items-center justify-center h-11 gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 active:scale-[0.98] normal-case tracking-normal group focus:outline-none focus:ring-0 ring-0 outline-none"
        >
          Create
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  )
}
