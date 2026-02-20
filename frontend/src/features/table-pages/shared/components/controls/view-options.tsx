import { type Table } from '@tanstack/react-table'
import { RotateCcw, Settings2 } from 'lucide-react'
import { useId } from 'react'

import { usePopover } from '@/components/context/popover-context'
import { Popover } from '@/components/popover'
import { TableColumnOrder } from '@/features/table-pages/shared/components/controls/column-order'
import { useSetOrderAction } from '@/store/table/table-order.store'
import { useSetVisibilityAction } from '@/store/table/table-visibility.store'

interface TableViewOptionsProps<TData> {
  tableId: string
  table: Table<TData>
  onReset?: () => void
}

export function TableViewOptions<TData>({ tableId, table, onReset }: TableViewOptionsProps<TData>) {
  const popoverId = useId()
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Open table view options"
        aria-controls={popoverId}
        className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 active:scale-[0.98] normal-case tracking-normal group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:border-blue-300 cursor-pointer"
      >
        <span>View</span>
        <Settings2 className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
      </Popover.Trigger>
      <ViewContent tableId={tableId} table={table} onReset={onReset} popoverId={popoverId} />
    </Popover.Root>
  )
}

// Separate component to access Popover context
function ViewContent<TData>({
  tableId,
  table,
  popoverId,
}: {
  tableId: string
  table: Table<TData>
  onReset?: (() => void) | undefined
  popoverId: string
}) {
  const { setOpen } = usePopover()
  const setOrder = useSetOrderAction()
  const setVisibility = useSetVisibilityAction()
  const closeSmooth = () => {
    window.setTimeout(() => setOpen(false), 80)
  }

  const resetToDefault = () => {
    const defaultOrder = [
      'DocEntry',
      'DocNum',
      'DocDate',
      'CardCode',
      'CardName',
      'DocTotal',
      'DocStatus',
      'Canceled',
    ]
    setOrder(tableId, [...defaultOrder])
    setVisibility(tableId, {})
    table.setColumnOrder([...defaultOrder])
    table.setColumnVisibility({})

    closeSmooth()
  }

  return (
    <Popover.Content
      id={popoverId}
      className="w-57.5 p-0 overflow-hidden border border-zinc-200 rounded-xl shadow-xl"
      align="end"
    >
      <div className="flex flex-col bg-white/95 backdrop-blur-xl">
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
