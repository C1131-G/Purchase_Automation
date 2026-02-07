import { type Table } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  ALPHANUMERIC_COLUMN_IDS,
  ALPHANUMERIC_MAX_LENGTH,
  ALPHANUMERIC_MIN_LENGTH,
  DOC_TOTAL_MAX,
  DOC_TOTAL_MIN,
  LETTERS_SYMBOLS_COLUMN_IDS,
  LETTERS_SYMBOLS_MAX_LENGTH,
  LETTERS_SYMBOLS_MIN_LENGTH,
  normalizeDocTotalInput,
  normalizeSearchInputByColumn,
  NUMBER_ONLY_COLUMN_IDS,
  NUMBER_ONLY_MAX_LENGTH,
  NUMBER_ONLY_MIN_LENGTH,
  parseDocTotalFilterValue,
} from '@/components/table/filters/table-search.validation'
import { Calendar } from '@/components/ui/calendar'
import { usePopover } from '@/components/ui/context/popover-context'
import { Input } from '@/components/ui/input'
import { Popover } from '@/components/ui/popover'
import { Select } from '@/components/ui/select'
import { getColumnTitle } from '@/components/ui/types/table-utils'
import {
  useSetDateFilterDraftAction,
  useTableDateFilterDraft,
} from '@/store/table/table-filter.store'
import { cn } from '@/utils/cn'
import { MOTION_MS } from '@/utils/motion'

interface TableSearchProps<TData> {
  table: Table<TData>
  activeFilterId: string | null
  className?: string
}

type DateRangeFilter = {
  from?: string | undefined
  to?: string | undefined
}

type NumberComparisonOperator = 'eq' | 'lt' | 'gt'
type NumberComparisonFilter = {
  operator: NumberComparisonOperator
  value: number
}
const NUMBER_OPERATOR_LABEL: Record<NumberComparisonOperator, string> = {
  eq: 'Equal (=)',
  lt: 'Less than (<)',
  gt: 'Greater than (>)',
}

type CalendarRangeSelection = {
  from?: Date | undefined
  to?: Date | undefined
}

const toDateRangeFilter = (from?: string, to?: string): DateRangeFilter => {
  const next: DateRangeFilter = {}
  if (from) next.from = from
  if (to) next.to = to
  return next
}

const isDateRangeFilter = (value: unknown): value is DateRangeFilter => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as { from?: unknown; to?: unknown }
  const fromValid = candidate.from === undefined || typeof candidate.from === 'string'
  const toValid = candidate.to === undefined || typeof candidate.to === 'string'
  return fromValid && toValid
}

const isNumberComparisonFilter = (value: unknown): value is NumberComparisonFilter => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as { operator?: unknown; value?: unknown }
  const operatorValid =
    candidate.operator === 'eq' || candidate.operator === 'lt' || candidate.operator === 'gt'
  const numericValue =
    typeof candidate.value === 'number' ? candidate.value : Number(candidate.value)
  const valueValid = Number.isFinite(numericValue)
  return operatorValid && valueValid
}

const isCalendarRangeSelection = (value: unknown): value is CalendarRangeSelection => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as { from?: unknown; to?: unknown }
  const fromValid = candidate.from === undefined || candidate.from instanceof Date
  const toValid = candidate.to === undefined || candidate.to instanceof Date
  return fromValid && toValid
}

const toDateOnly = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeRange = (range: DateRangeFilter): DateRangeFilter => {
  if (!range.from || !range.to) return toDateRangeFilter(range.from, range.to)
  return range.from <= range.to
    ? { from: range.from, to: range.to }
    : { from: range.to, to: range.from }
}

const toNumberComparisonFilter = (
  operator: NumberComparisonOperator,
  rawValue: string,
): NumberComparisonFilter | null => {
  const parsed = parseDocTotalFilterValue(rawValue.trim())
  if (parsed === null) return null
  return { operator, value: parsed }
}

function DateCalendarPanel({
  selectedRange,
  onRangeChange,
}: {
  selectedRange: CalendarRangeSelection
  onRangeChange: (range: DateRangeFilter) => void
}) {
  const { setOpen } = usePopover()

  return (
    <div className="p-3">
      <Calendar
        mode="range"
        selected={selectedRange}
        onSelect={(value) => {
          if (!value) {
            onRangeChange({})
            return
          }
          if (!isCalendarRangeSelection(value)) return
          const from = value.from ? toDateOnly(value.from) : undefined
          const to = value.to ? toDateOnly(value.to) : undefined
          const next = toDateRangeFilter(from, to)
          onRangeChange(next)
          if (next.from && next.to) {
            window.setTimeout(() => setOpen(false), MOTION_MS.calendarAutoClose)
          }
        }}
      />
    </div>
  )
}

const formatDateDisplay = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(`${dateStr}T00:00:00`)
  const d = String(date.getDate()).padStart(2, '0')
  const m = date.toLocaleString('en-US', { month: 'short' })
  const y = date.getFullYear()
  return `${d} ${m} ${y}`
}

export function TableSearch<TData>({ table, activeFilterId, className }: TableSearchProps<TData>) {
  const tableId = (table.options.meta as any)?.tableId ?? 'default'
  const [searchValue, setSearchValue] = useState('')
  const [draftNumberFilter, setDraftNumberFilter] = useState<{
    operator: NumberComparisonOperator
    value: string
  }>({
    operator: 'eq',
    value: '',
  })
  const lastNumberColumnIdRef = useRef<string | null>(null)

  const zustandDraft = useTableDateFilterDraft(tableId, activeFilterId ?? '')
  const setZustandDraft = useSetDateFilterDraftAction()

  // Find the active column object
  const activeColumn = table.getAllLeafColumns().find((col) => col.id === activeFilterId)
  const activeTitle = activeColumn ? getColumnTitle(activeColumn, table) : '...'

  // Get config from TanStack metadata
  const meta = activeColumn?.columnDef.meta
  const filterType = meta?.filterType
  const filterOptions = meta?.filterOptions
  const activeFilterValue = activeColumn?.getFilterValue()
  const activeFilterValueKey = useMemo(() => {
    try {
      return JSON.stringify(activeFilterValue ?? null)
    } catch {
      return String(activeFilterValue ?? null)
    }
  }, [activeFilterValue])

  // Sync input with table filter state
  useEffect(() => {
    if (activeColumn) {
      const currentFilterValue = activeColumn.getFilterValue()
      if (filterType === 'date') {
        setSearchValue('')
        const parsed = isDateRangeFilter(currentFilterValue) ? currentFilterValue : {}

        if (currentFilterValue !== undefined) {
          if (!zustandDraft || (zustandDraft.from === undefined && zustandDraft.to === undefined)) {
            if (parsed.from !== zustandDraft?.from || parsed.to !== zustandDraft?.to) {
              setZustandDraft(tableId, activeFilterId!, toDateRangeFilter(parsed.from, parsed.to))
            }
          }
        }
        return
      }
      if (filterType === 'number-comparison') {
        setSearchValue('')
        const parsed = isNumberComparisonFilter(currentFilterValue) ? currentFilterValue : null
        const hasSwitchedNumberColumn = lastNumberColumnIdRef.current !== activeColumn.id
        if (hasSwitchedNumberColumn) {
          lastNumberColumnIdRef.current = activeColumn.id
          setDraftNumberFilter(
            parsed
              ? { operator: parsed.operator, value: String(parsed.value) }
              : { operator: 'eq', value: '' },
          )
          return
        }

        // Don't overwrite a local operator change while debounce apply is pending.
        if (
          parsed &&
          draftNumberFilter.value.trim() !== '' &&
          Number(draftNumberFilter.value) === parsed.value &&
          draftNumberFilter.operator !== parsed.operator
        ) {
          return
        }

        if (parsed) {
          setDraftNumberFilter((prev) => {
            if (prev.operator === parsed.operator && prev.value === String(parsed.value)) {
              return prev
            }
            return {
              operator: parsed.operator,
              value: String(parsed.value),
            }
          })
        }
        return
      }
      lastNumberColumnIdRef.current = null
      setSearchValue(
        currentFilterValue === undefined || currentFilterValue === null
          ? ''
          : String(currentFilterValue),
      )
    } else {
      lastNumberColumnIdRef.current = null
      setSearchValue('')
      setDraftNumberFilter({ operator: 'eq', value: '' })
    }
  }, [
    activeColumn,
    activeFilterId,
    activeFilterValueKey,
    filterType,
    tableId,
    setZustandDraft,
    zustandDraft?.from,
    zustandDraft?.to,
  ])

  const handleSearchChange = (value: string) => {
    const normalizedValue = normalizeSearchInputByColumn(activeColumn?.id, value)
    setSearchValue(normalizedValue)
    if (activeColumn) {
      activeColumn.setFilterValue(normalizedValue === '' ? undefined : normalizedValue)
    }
  }

  useEffect(() => {
    if (!activeColumn || filterType !== 'number-comparison') return

    const timeout = window.setTimeout(() => {
      const raw = draftNumberFilter.value.trim()
      if (raw === '') {
        if (activeColumn.getFilterValue() !== undefined) {
          activeColumn.setFilterValue(undefined)
        }
        return
      }

      const nextFilter = toNumberComparisonFilter(draftNumberFilter.operator, raw)
      if (nextFilter === null) {
        // Keep previous valid filter while user is typing incomplete/invalid input.
        return
      }

      activeColumn.setFilterValue(nextFilter)
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [activeColumn, filterType, draftNumberFilter.operator, draftNumberFilter.value])

  const { selectedRange, previewRange, label } = useMemo(() => {
    if (filterType !== 'date') return { selectedRange: {}, previewRange: {}, label: '' }

    const appliedRange = isDateRangeFilter(activeFilterValue) ? activeFilterValue : {}
    const pRange = zustandDraft?.from || zustandDraft?.to ? zustandDraft : appliedRange

    const sRange: CalendarRangeSelection = {}
    if (pRange.from) sRange.from = new Date(`${pRange.from}T00:00:00`)
    if (pRange.to) sRange.to = new Date(`${pRange.to}T00:00:00`)

    let lbl = 'Pick a date'
    if (pRange.from && pRange.to) {
      lbl = `${formatDateDisplay(pRange.from)} - ${formatDateDisplay(pRange.to)}`
    } else if (pRange.from) {
      lbl = formatDateDisplay(pRange.from)
    }

    return { selectedRange: sRange, previewRange: pRange, label: lbl }
  }, [filterType, activeFilterValue, zustandDraft])

  if (!activeColumn) {
    return null
  }

  // Explicitly show nothing for unsupported types in search bar
  if (filterType === 'number-comparison') {
    return (
      <div className={cn('flex flex-1 max-w-sm items-center gap-2', className)}>
        <Select.Root
          value={draftNumberFilter.operator}
          onValueChange={(value) => {
            if (value === 'eq' || value === 'lt' || value === 'gt') {
              setDraftNumberFilter((prev) => ({ ...prev, operator: value }))
            }
          }}
        >
          <Select.Trigger className="w-[160px] h-11 bg-zinc-50/50 border-zinc-200 hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all rounded-xl text-[13px] font-medium">
            <span className="truncate text-zinc-900 font-medium">
              {NUMBER_OPERATOR_LABEL[draftNumberFilter.operator]}
            </span>
            <Select.Icon>
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <Select.Item value="eq" label={NUMBER_OPERATOR_LABEL.eq}>
                    Equal (=)
                  </Select.Item>
                  <Select.Item value="lt" label={NUMBER_OPERATOR_LABEL.lt}>
                    Less than (&lt;)
                  </Select.Item>
                  <Select.Item value="gt" label={NUMBER_OPERATOR_LABEL.gt}>
                    Greater than (&gt;)
                  </Select.Item>
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>

        <Input
          type="text"
          inputMode="decimal"
          name="docTotalFilterValue"
          value={draftNumberFilter.value}
          onChange={(e) => {
            const nextValue = normalizeDocTotalInput(e.target.value)
            setDraftNumberFilter((prev) => ({ ...prev, value: nextValue }))
            if (nextValue.trim() === '') {
              activeColumn.setFilterValue(undefined)
            }
          }}
          placeholder={`Filter ${activeTitle}...`}
          pattern="[0-9]*[.]?[0-9]*"
          minLength={1}
          maxLength={14}
          min={DOC_TOTAL_MIN}
          max={DOC_TOTAL_MAX}
          className="h-11 bg-zinc-50/50 border-zinc-200 hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all rounded-xl text-[13px] font-medium"
        />
      </div>
    )
  }

  if (filterType === 'date') {
    return (
      <div className={cn('flex flex-1 max-w-sm items-center gap-2', className)}>
        <Popover.Root>
          <Popover.Trigger className="w-full min-w-[340px] h-11 bg-zinc-50/50 border border-zinc-200 hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all duration-200 ease-out rounded-xl text-[13px] font-medium px-3 text-left flex items-center active:scale-[0.99] cursor-pointer">
            <span className={cn('truncate', previewRange.from ? 'text-zinc-900' : 'text-zinc-400')}>
              {label}
            </span>
          </Popover.Trigger>
          <Popover.Content align="start" className="p-0 will-change-transform" unstyled>
            <DateCalendarPanel
              selectedRange={selectedRange}
              onRangeChange={(next) => {
                setZustandDraft(tableId, activeFilterId!, next)
                const normalized = normalizeRange(next)
                if (normalized.from && normalized.to) {
                  activeColumn.setFilterValue({
                    from: normalized.from,
                    to: normalized.to,
                  })
                } else if (!normalized.from && !normalized.to) {
                  activeColumn.setFilterValue(undefined)
                }
              }}
            />
          </Popover.Content>
        </Popover.Root>
      </div>
    )
  }

  // Render select dropdown for status/boolean columns
  if (filterType === 'select' || filterType === 'boolean') {
    return (
      <div className={cn('relative flex-1 max-w-sm', className)}>
        <Select.Root value={searchValue} onValueChange={handleSearchChange}>
          <Select.Trigger className="w-full h-11 bg-zinc-50/50 border-zinc-200 hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all rounded-xl text-[13px] font-medium">
            <Select.Value placeholder={`Filter ${activeTitle}...`} />
            <Select.Icon>
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <Select.Item value="">All</Select.Item>
                  {filterOptions?.map((option) => {
                    const value = typeof option === 'string' ? option : option.value
                    const labelText = typeof option === 'string' ? option : option.label

                    let icon = null
                    if (labelText === 'Open')
                      icon = <div className="size-2 rounded-full bg-emerald-500" />
                    if (labelText === 'Closed')
                      icon = <div className="size-2 rounded-full bg-zinc-400" />
                    if (labelText === 'Yes (Canceled)')
                      icon = (
                        <svg
                          className="size-4 text-emerald-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )
                    if (labelText === 'No (Active)')
                      icon = (
                        <svg
                          className="size-4 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )

                    const label = (
                      <div className="flex items-center gap-2">
                        {icon}
                        <span>{labelText}</span>
                      </div>
                    )

                    return (
                      <Select.Item key={value} value={value} label={label}>
                        {label}
                      </Select.Item>
                    )
                  })}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>
    )
  }

  // Unified search for most columns
  return (
    <div className={cn('relative flex-1 max-w-sm group', className)}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-within:text-blue-600 transition-colors pointer-events-none">
        <Search className="size-3.5" />
      </div>
      <Input
        value={searchValue}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder={`Search ${activeTitle}...`}
        inputMode={
          activeColumn && NUMBER_ONLY_COLUMN_IDS.has(activeColumn.id) ? 'numeric' : undefined
        }
        pattern={
          activeColumn && NUMBER_ONLY_COLUMN_IDS.has(activeColumn.id)
            ? '[0-9]*'
            : activeColumn && ALPHANUMERIC_COLUMN_IDS.has(activeColumn.id)
              ? '[A-Za-z0-9]*'
              : activeColumn && LETTERS_SYMBOLS_COLUMN_IDS.has(activeColumn.id)
                ? '[^0-9]*'
                : undefined
        }
        minLength={
          activeColumn &&
          (NUMBER_ONLY_COLUMN_IDS.has(activeColumn.id) ||
            ALPHANUMERIC_COLUMN_IDS.has(activeColumn.id) ||
            LETTERS_SYMBOLS_COLUMN_IDS.has(activeColumn.id))
            ? NUMBER_ONLY_COLUMN_IDS.has(activeColumn.id)
              ? NUMBER_ONLY_MIN_LENGTH
              : ALPHANUMERIC_COLUMN_IDS.has(activeColumn.id)
                ? ALPHANUMERIC_MIN_LENGTH
                : LETTERS_SYMBOLS_MIN_LENGTH
            : undefined
        }
        maxLength={
          activeColumn && NUMBER_ONLY_COLUMN_IDS.has(activeColumn.id)
            ? NUMBER_ONLY_MAX_LENGTH
            : activeColumn && ALPHANUMERIC_COLUMN_IDS.has(activeColumn.id)
              ? ALPHANUMERIC_MAX_LENGTH
              : activeColumn && LETTERS_SYMBOLS_COLUMN_IDS.has(activeColumn.id)
                ? LETTERS_SYMBOLS_MAX_LENGTH
                : undefined
        }
        className="pl-11 pr-11 h-11 bg-zinc-50/50 border-zinc-200 hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all rounded-xl text-[13px] font-bold"
      />
    </div>
  )
}
