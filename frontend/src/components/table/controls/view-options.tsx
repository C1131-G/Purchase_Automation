import { type Table } from '@tanstack/react-table'
import { RotateCcw, Settings2 } from 'lucide-react'
import { Popover } from '@/components/ui/popover'
import { usePopover } from '@/components/ui/context/popover-context'
import { TableColumnOrder } from '@/components/table/controls/column-order'
import { useSetOrderAction } from '@/store/table/table-order.store'
import { useSetVisibilityAction } from '@/store/table/table-visibility.store'

interface TableViewOptionsProps<TData> {
    tableId: string
    table: Table<TData>
    onReset?: () => void
}

export function TableViewOptions<TData>({ tableId, table, onReset }: TableViewOptionsProps<TData>) {
    return (
        <Popover.Root>
            <Popover.Trigger className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 active:scale-[0.98] normal-case tracking-normal group focus:outline-none cursor-pointer">
                <span>View</span>
                <Settings2 className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
            </Popover.Trigger>
            <ViewContent tableId={tableId} table={table} onReset={onReset} />
        </Popover.Root>
    )
}

// Separate component to access Popover context
function ViewContent<TData>({ tableId, table }: { tableId: string, table: Table<TData>, onReset?: (() => void) | undefined }) {
    const { setOpen } = usePopover()
    const setOrder = useSetOrderAction()
    const setVisibility = useSetVisibilityAction()
    const closeSmooth = () => {
        window.setTimeout(() => setOpen(false), 80)
    }

    const resetToDefault = () => {
        const defaultOrder = ['DocEntry', 'DocNum', 'DocDate', 'CardCode', 'CardName', 'DocTotal', 'DocStatus', 'Canceled']
        setOrder(tableId, [...defaultOrder])
        setVisibility(tableId, {})
        table.setColumnOrder([...defaultOrder])
        table.setColumnVisibility({})

        closeSmooth()
    }

    return (
        <Popover.Content className="w-[230px] p-0 overflow-hidden border border-zinc-200 rounded-xl shadow-xl" align="end">
            <div className="flex flex-col bg-white/95 backdrop-blur-xl">

                {/* Columns List */}
                <div className="px-1.5 py-1.5">
                    <TableColumnOrder
                        tableId={tableId}
                        table={table}
                        search=""
                        onToggleComplete={closeSmooth}
                    />
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-100/80 bg-zinc-50/30">
                    <button
                        type="button"
                        onClick={resetToDefault}
                        className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 transition-all active:scale-[0.98] cursor-pointer"
                    >
                        <RotateCcw className="size-3" />
                        <span>Reset to Default</span>
                    </button>
                </div>
            </div>
        </Popover.Content>
    )
}
