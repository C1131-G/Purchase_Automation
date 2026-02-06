import { type Column, type Table } from '@tanstack/react-table'
import { ListFilter } from 'lucide-react'
import { Popover } from '@/components/ui/popover'
import { Select } from '@/components/ui/select'
import { DebouncedInput } from '@/components/ui/debounced-input'
import { cn } from '@/utils/cn'
import { getColumnTitle } from '@/components/ui/types/table-utils'

interface TableColumnFilterProps<TData, TValue> {
    column: Column<TData, TValue>
    table: Table<TData>
}

export function TableColumnFilter<TData, TValue>({
    column,
    table,
}: TableColumnFilterProps<TData, TValue>) {
    const columnFilterValue = column.getFilterValue() as string
    const isActive = !!columnFilterValue

    const filterType = column.columnDef.meta?.filterType
    const columnTitle = getColumnTitle(column, table)

    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <button
                    className={cn(
                        "flex items-center justify-center size-7 rounded-lg transition-all border outline-none",
                        isActive
                            ? "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                            : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                    )}
                >
                    <ListFilter className="size-3.5" strokeWidth={isActive ? 2.5 : 2} />
                </button>
            </Popover.Trigger>
            <Popover.Content className="w-56 p-2 shadow-2xl border-zinc-100/50 backdrop-blur-3xl bg-white/90 rounded-2xl ring-1 ring-black/5" align="start">
                <div className="space-y-1">
                    {filterType === 'select' ? (
                        <Select.Root
                            value={columnFilterValue ?? 'all'}
                            onValueChange={(val) => column.setFilterValue(val === "all" ? undefined : val)}
                        >
                            <Select.Trigger className="w-full h-8 text-[13px] border-zinc-200/80 bg-white/50 hover:bg-white rounded-lg px-2">
                                <Select.Value placeholder={`Select ${columnTitle}...`} />
                            </Select.Trigger>
                            <Select.Portal>
                                <Select.Positioner className="w-[var(--radix-select-trigger-width)] z-50">
                                    <Select.Popup className="p-1 rounded-xl">
                                        <Select.List>
                                            <Select.Item value="all" className="text-[13px] rounded-md">All</Select.Item>
                                            {column.columnDef.meta?.filterOptions?.map((option) => (
                                                <Select.Item
                                                    key={option.value}
                                                    value={option.value}
                                                    className="text-[13px] rounded-md"
                                                >
                                                    {option.label}
                                                </Select.Item>
                                            ))}
                                        </Select.List>
                                    </Select.Popup>
                                </Select.Positioner>
                            </Select.Portal>
                        </Select.Root>
                    ) : (
                        <DebouncedInput
                            value={columnFilterValue ?? ''}
                            onChange={(value) => column.setFilterValue(value === '' ? undefined : value)}
                            placeholder={`Filter ${columnTitle}...`}
                            autoFocus
                        />
                    )}
                </div>
            </Popover.Content>
        </Popover.Root>
    )
}

