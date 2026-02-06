import { type Table, type Column, type ColumnFiltersState } from '@tanstack/react-table'
import { Filter, Check } from 'lucide-react'
import { Popover } from '@/components/ui/popover'
import { usePopover } from '@/components/ui/context/popover-context'
import { cn } from '@/utils/cn'
import { useMemo } from 'react'
import { getColumnTitle } from '@/components/ui/types/table-utils'
import { useTableColumnFilters } from '@/store/table/table-filter.store'
import { useClearDateFilterDraftAction } from '@/store/table/table-filter.store'
import { hasFilterValue } from '@/components/ui/types/filter-utils'

interface TableFilterOptionsProps<TData> {
    tableId: string
    table: Table<TData>
    activeFilterId: string | null
    setActiveFilterId: (id: string | null) => void
}


export function TableFilterOptions<TData>({
    tableId,
    table,
    activeFilterId,
    setActiveFilterId
}: TableFilterOptionsProps<TData>) {
    const storeColumnFilters = useTableColumnFilters(tableId)
    const columnFilters = useMemo(() => {
        const normalized = storeColumnFilters.filter((filter) => hasFilterValue(filter.value))
        const seen = new Set<string>()
        return normalized.filter((filter) => {
            const key = `${filter.id}:${JSON.stringify(filter.value)}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
    }, [storeColumnFilters])

    const allColumns = table.getAllLeafColumns().filter(
        (column) => column.getCanFilter() && !!column.columnDef.header,
    )

    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all active:scale-[0.98] normal-case tracking-normal group focus:outline-none cursor-pointer hover:bg-zinc-50 hover:text-blue-600"
                >
                    <span>Filter</span>
                    <Filter className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 text-zinc-400 group-hover:text-blue-500" />
                </button>
            </Popover.Trigger>
            <FilterContent
                tableId={tableId}
                table={table}
                allColumns={allColumns}
                activeFilter={activeFilterId}
                columnFilters={columnFilters}
                setActiveFilter={setActiveFilterId}
            />
        </Popover.Root>
    )
}

// Separate component to access Popover context
function FilterContent<TData>({
    tableId,
    table,
    allColumns,
    activeFilter,
    columnFilters,
    setActiveFilter
}: {
    tableId: string
    table: Table<TData>
    allColumns: Column<TData, unknown>[]
    activeFilter: string | null
    columnFilters: ColumnFiltersState
    setActiveFilter: (filter: string | null) => void
}) {
    const { setOpen } = usePopover()
    const clearDateFilterDraft = useClearDateFilterDraftAction()
    const closeSmooth = () => {
        window.setTimeout(() => setOpen(false), 80)
    }

    const handleFilterChange = (columnId: string) => {
        // Toggle: if already active, deactivate; otherwise activate
        if (activeFilter === columnId) {
            const column = table.getColumn(columnId)
            column?.setFilterValue(undefined)
            clearDateFilterDraft(tableId, columnId)
            setActiveFilter(null)
        } else {
            setActiveFilter(columnId)
        }
        closeSmooth()
    }

    return (
        <Popover.Content className="w-[230px] p-0 overflow-hidden border border-zinc-200 rounded-xl shadow-xl" align="start">
            <div className="flex flex-col bg-white/95 backdrop-blur-xl">
                {/* Columns List */}
                <div className="px-1.5 py-1.5">
                    <div className="flex flex-col gap-px">
                        {allColumns.map((column) => {
                            const columnId = column.id
                            const isActive = activeFilter === columnId
                            const hasValue = columnFilters.some((f) => f.id === columnId && hasFilterValue(f.value))
                            const isChecked = isActive || hasValue
                            const columnName = getColumnTitle(column, table)

                            return (
                                <div
                                    key={columnId}
                                    className="group flex items-center justify-between rounded-md px-2 py-[10px] text-[12px] select-none border border-transparent transition-colors hover:bg-zinc-50 text-zinc-900"
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleFilterChange(columnId)}
                                        className={cn(
                                            "truncate transition-colors cursor-pointer text-left flex-1",
                                            isActive
                                                ? "text-blue-600 font-semibold"
                                                : hasValue
                                                    ? "text-blue-500 font-medium"
                                                    : "text-zinc-700 font-medium hover:text-blue-600"
                                        )}
                                    >
                                        {columnName}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleFilterChange(columnId)}
                                        className={cn(
                                            "ml-2 flex items-center justify-center size-4 rounded border transition-all cursor-pointer shrink-0",
                                            isChecked
                                                ? "bg-blue-500 border-blue-500 text-white shadow-sm"
                                                : "border-zinc-300 bg-white text-transparent hover:border-blue-400 hover:bg-blue-50/50"
                                        )}
                                    >
                                        <Check className="size-2.5" strokeWidth={3} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </Popover.Content>
    )
}
