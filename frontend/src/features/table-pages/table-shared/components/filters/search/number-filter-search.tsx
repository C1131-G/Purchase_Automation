import { type Table } from '@tanstack/react-table'
import { useEffect, useRef, useState } from 'react'

import { Input } from '@/components/input/input'
import { Select } from '@/components/select/select'
import { normalizeDocTotalInput } from '@/features/table-pages/table-shared/components/filters/table-search.validation'
import {
  isNumberComparisonFilter,
  type NumberComparisonOperator,
} from '@/features/table-pages/table-shared/utils/table-filter-values'
import { cn } from '@/shared/utils/cn'

import { type NumberComparisonSearchProps } from './table-search.types'
import { toNumberComparisonFilter } from './table-search.utils'

const applyNumberComparisonFilter = <TData,>(
  table: Table<TData>,
  columnId: string,
  operator: NumberComparisonOperator,
  rawValue: string,
) => {
  const column = table.getColumn(columnId)
  if (!column) return
  const trimmed = rawValue.trim()
  if (trimmed === '') {
    if (column.getFilterValue() !== undefined) {
      column.setFilterValue(undefined)
    }
    return
  }
  const nextFilter = toNumberComparisonFilter(operator, trimmed)
  if (!nextFilter) return
  column.setFilterValue(nextFilter)
}

export function NumberFilterSearch<TData>({
  table,
  activeColumn,
  activeColumnId,
  className,
}: NumberComparisonSearchProps<TData>) {
  const [draftNumberFilter, setDraftNumberFilter] = useState({
    operator: 'eq' as NumberComparisonOperator,
    value: '',
  })

  const isEditingNumberInputRef = useRef(false)

  const activeFilterValue = activeColumn.getFilterValue()

  // Sync state from table
  useEffect(() => {
    const currentFilterValue = activeColumn.getFilterValue()
    const parsed = isNumberComparisonFilter(currentFilterValue) ? currentFilterValue : null
    const isEditing = isEditingNumberInputRef.current

    setDraftNumberFilter((prev) => {
      if (isEditing) return prev

      // If external filter changed, reset editing flag and update state
      if (parsed) {
        if (prev.operator !== parsed.operator || prev.value !== String(parsed.value)) {
          return { operator: parsed.operator, value: String(parsed.value) }
        }
      } else if (prev.value !== '') {
        return { operator: 'eq', value: '' }
      }
      return prev
    })
  }, [activeColumn, activeFilterValue])

  // Apply changes to table with debounce
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      applyNumberComparisonFilter(
        table,
        activeColumnId,
        draftNumberFilter.operator,
        draftNumberFilter.value,
      )
      isEditingNumberInputRef.current = false
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [table, activeColumnId, draftNumberFilter.operator, draftNumberFilter.value])

  return (
    <div className={cn('flex w-full items-center gap-2', className)}>
      <div className="w-[80px] shrink-0">
        <Select
          value={draftNumberFilter.operator}
          onValueChange={(value: string) => {
            const operator = value as NumberComparisonOperator
            if (operator === 'eq' || operator === 'lt' || operator === 'gt') {
              isEditingNumberInputRef.current = true
              setDraftNumberFilter((prev) => {
                const next = { ...prev, operator }
                applyNumberComparisonFilter(table, activeColumnId, next.operator, next.value)
                return next
              })
            }
          }}
        >
          <Select.Trigger className="w-full h-11 bg-zinc-50/50 border-zinc-200 hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all rounded-xl text-[13px] font-normal">
            <span className="truncate text-zinc-900 font-normal">
              {draftNumberFilter.operator === 'eq'
                ? '='
                : draftNumberFilter.operator === 'lt'
                  ? '<'
                  : '>'}
            </span>
            <Select.Icon>
              <svg
                className="size-3.5 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.List>
                  <Select.Item value="eq">Equal (=)</Select.Item>
                  <Select.Item value="lt">Less than (&lt;)</Select.Item>
                  <Select.Item value="gt">Greater than (&gt;)</Select.Item>
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select>
      </div>

      <Input
        type="text"
        inputMode="decimal"
        value={draftNumberFilter.value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          const nextValue = normalizeDocTotalInput(event.target.value)
          isEditingNumberInputRef.current = true
          setDraftNumberFilter((prev) => ({ ...prev, value: nextValue }))
          if (nextValue.trim() === '') {
            applyNumberComparisonFilter(table, activeColumnId, draftNumberFilter.operator, '')
          }
        }}
        placeholder="Value..."
        className="flex-1 h-11 w-full bg-zinc-50/50 border-zinc-200 hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all rounded-xl text-[13px] font-normal"
      />
    </div>
  )
}
