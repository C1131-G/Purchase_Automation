import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type Table } from '@tanstack/react-table'
import { Check, GripVertical } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { getColumnTitle } from '@/components/ui/types/table-utils'
import { useSetOrderAction } from '@/store/table/table-order.store'
import { useSetVisibilityAction } from '@/store/table/table-visibility.store'
import { cn } from '@/utils/cn'

interface TableColumnOrderProps<TData> {
  tableId: string
  table: Table<TData>
  search: string
  onToggleComplete?: () => void
}

export function TableColumnOrder<TData>({
  tableId,
  table,
  search,
  onToggleComplete,
}: TableColumnOrderProps<TData>) {
  const setOrder = useSetOrderAction()
  const setVisibility = useSetVisibilityAction()

  // Read directly from table state (which is derived from URL)
  const tableOrder = table.getState().columnOrder

  const columns = table
    .getAllLeafColumns()
    .filter((column) => column.id !== 'actions' && !!column.columnDef.header)
  const columnOrder = tableOrder
  const columnsById = useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns],
  )
  const safeColumnOrder = useMemo(() => {
    const validIds = columns.map((column) => column.id)
    const validFromState = columnOrder.filter((id) => validIds.includes(id))
    const missingIds = validIds.filter((id) => !validFromState.includes(id))
    return [...validFromState, ...missingIds]
  }, [columnOrder, columns])
  const [localOrder, setLocalOrder] = useState<string[]>(safeColumnOrder)

  useEffect(() => {
    setLocalOrder(safeColumnOrder)
  }, [safeColumnOrder])
  const tableVisibility = table.getState().columnVisibility
  const [localVisibility, setLocalVisibility] = useState<Record<string, boolean>>(tableVisibility)

  useEffect(() => {
    setLocalVisibility(tableVisibility)
  }, [tableVisibility])

  const handleToggleVisibility = (columnId: string) => {
    const currentVisible = localVisibility[columnId] !== false
    const nextVisibility = {
      ...localVisibility,
      [columnId]: !currentVisible,
    }
    const normalizedVisibility = Object.fromEntries(
      Object.entries(nextVisibility).filter(([, visible]) => visible === false),
    )
    setLocalVisibility(normalizedVisibility)
    setVisibility(tableId, normalizedVisibility)
    table.setColumnVisibility(normalizedVisibility)
    onToggleComplete?.()
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = localOrder.indexOf(active.id as string)
    const newIndex = localOrder.indexOf(over.id as string)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(localOrder, oldIndex, newIndex)
      setLocalOrder(newOrder)
      setOrder(tableId, newOrder)
      table.setColumnOrder(newOrder)
    }
  }

  return (
    <DndContext
      id="column-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={localOrder} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-px">
          {localOrder.map((columnId) => {
            const column = columnsById.get(columnId)
            if (!column) return null

            const title = getColumnTitle(column, table)
            if (search && !title.toLowerCase().includes(search.toLowerCase())) return null

            return (
              <SortableItem
                key={column.id}
                id={column.id}
                title={title}
                isVisible={localVisibility[column.id] !== false}
                onToggleVisibility={handleToggleVisibility}
              />
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}

interface SortableItemProps {
  id: string
  title: string
  isVisible: boolean
  onToggleVisibility: (columnId: string) => void
}

function SortableItem({ id, title, isVisible, onToggleVisibility }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const,
  }

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleVisibility(id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center justify-between rounded-md px-2 py-1 text-[12px] select-none border border-transparent transition-colors',
        isDragging
          ? 'bg-white shadow-md border-zinc-200 ring-1 ring-blue-100'
          : 'hover:bg-zinc-50 text-zinc-900',
      )}
    >
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 -ml-1 text-zinc-300 hover:text-blue-500 transition-colors rounded-md active:bg-zinc-100"
        >
          <GripVertical className="size-3.5" />
        </div>
        <button
          type="button"
          onClick={handleToggleVisibility}
          className={cn(
            'truncate font-medium transition-colors cursor-pointer text-left flex-1',
            isVisible ? 'text-zinc-700 hover:text-blue-600' : 'text-zinc-400 hover:text-blue-400',
          )}
        >
          {title}
        </button>
      </div>

      <button
        type="button"
        onClick={handleToggleVisibility}
        className={cn(
          'ml-2 flex items-center justify-center size-4 rounded border transition-all cursor-pointer shrink-0',
          isVisible
            ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
            : 'border-zinc-300 bg-white text-transparent hover:border-blue-400 hover:bg-blue-50/50',
        )}
      >
        <Check className="size-2.5" strokeWidth={3} />
      </button>
    </div>
  )
}
