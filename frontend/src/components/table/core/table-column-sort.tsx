import type { Column, SortingState } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import React from 'react'

import { cn } from '@/utils/cn'

interface TableColumnSortProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
  sortingState?: SortingState
}

export function TableColumnSort<TData, TValue>({
  column,
  title,
  sortingState,
  className,
}: TableColumnSortProps<TData, TValue>) {
  const canSort = column.getCanSort()
  const sortFromState = sortingState?.find((entry) => entry.id === column.id)
  const isSorted = sortFromState ? (sortFromState.desc ? 'desc' : 'asc') : column.getIsSorted()

  if (!canSort) {
    return (
      <div
        className={cn(
          'text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-sans',
          className,
        )}
      >
        {title}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={cn(
        'group/sort flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer outline-none select-none py-1.5 rounded-lg px-2 -ml-2 hover:text-blue-600 group-hover:text-blue-600',
        isSorted ? 'text-blue-600 bg-blue-50/30' : 'text-zinc-600',
        className,
      )}
    >
      <span className="font-sans whitespace-nowrap">{title}</span>
      <div className="flex items-center justify-center shrink-0">
        {isSorted === 'asc' && <ArrowUp className="size-3.5 stroke-[2.5px]" />}
        {isSorted === 'desc' && <ArrowDown className="size-3.5 stroke-[2.5px]" />}
        {!isSorted && (
          <ChevronsUpDown className="size-3.5 text-zinc-300 group-hover/sort:text-blue-500 group-hover:text-blue-400 transition-colors stroke-[2px]" />
        )}
      </div>
    </button>
  )
}
