import { type Table } from '@tanstack/react-table'
import { Search, Check } from 'lucide-react'
import { useState, useMemo } from 'react'
import { cn } from '@/utils/cn'

interface TableColumnVisibilityProps<TData> {
    table: Table<TData>
}

export function TableColumnVisibility<TData>({ table }: TableColumnVisibilityProps<TData>) {
    const [search, setSearch] = useState('')

    const columns = table.getAllLeafColumns().filter(
        (column) => typeof column.columnDef.header === 'string' || !!column.columnDef.header
    )

    const filteredColumns = useMemo(() => {
        return columns.filter((col) => {
            const header = col.columnDef.header
            const title = typeof header === 'string' ? header : col.id
            return title.toLowerCase().includes(search.toLowerCase())
        })
    }, [columns, search])

    return (
        <div className="flex flex-col">
            {/* Search Header */}
            <div className="p-3 border-b border-zinc-50 relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-4 text-zinc-300 transition-colors group-focus-within:text-blue-500" />
                <input
                    id="column-visibility-search"
                    name="columnVisibilitySearch"
                    placeholder="Search columns..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-zinc-50/50 border border-zinc-100 rounded-lg h-9 pl-9 pr-3 text-[13px] text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all font-outfit"
                />
            </div>

            {/* Columns List */}
            <div className="max-h-[200px] overflow-y-auto p-1.5 space-y-0.5 no-scrollbar">
                {filteredColumns.map((column) => {
                    const isVisible = column.getIsVisible()
                    const header = column.columnDef.header
                    const title = typeof header === 'string' ? header : column.id

                    return (
                        <div
                            key={column.id}
                            className={cn(
                                'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-200 cursor-pointer',
                                isVisible ? 'text-blue-600 bg-blue-50/30 font-semibold' : 'hover:bg-zinc-50 text-zinc-600'
                            )}
                            onClick={() => table.setColumnVisibility((prev) => ({
                                ...prev,
                                [column.id]: !isVisible,
                            }))}
                        >
                            <span className="flex-1 truncate">
                                {title}
                            </span>
                            {isVisible && (
                                <Check className="size-4 text-blue-600 shrink-0" />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
