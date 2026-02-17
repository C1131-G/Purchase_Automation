import { type SelectOption, type Table } from '@tanstack/react-table'
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
import {
  type DateRangeFilter,
  hasDateRangeValue,
  isDateRangeFilter,
  isNumberComparisonFilter,
  normalizeDateRange,
  type NumberComparisonFilter,
  type NumberComparisonOperator,
  toDateRangeFilter,
} from '@/components/ui/types/table-filter-values'
import { getColumnTitle } from '@/components/ui/types/table-utils'
import { cn } from '@/shared/utils/cn'
import { MOTION_MS } from '@/shared/utils/motion'
import {
  useSetDateFilterDraftAction,
  useTableColumnFilters,
  useTableDateFilterDraft,
} from '@/store/table/table-filter.store'

interface TableSearchProps<TData> {
  table: Table<TData>
  activeFilterId: string | null
  className?: string
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

const isCalendarRangeSelection = (value: unknown): value is CalendarRangeSelection => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as { from?: unknown; to?: unknown }
  const fromValid = candidate.from === undefined || candidate.from instanceof Date
  const toValid = candidate.to === undefined || candidate.to instanceof Date
  return fromValid && toValid
}

const toDateOnly = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toNumberComparisonFilter = (
  operator: NumberComparisonOperator,
  rawValue: string,
): NumberComparisonFilter | null => {
  const parsed = parseDocTotalFilterValue(rawValue.trim())
  if (parsed === null) return null
  return { operator, value: parsed }
}

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

function DateCalendarPanel({
  selectedRange,
  onRangeChange,
}: {
  selectedRange: CalendarRangeSelection
  onRangeChange: (range: DateRangeFilter) => boolean
}) {
  const { setOpen } = usePopover()
  const today = new Date()
  const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div className="p-3">
      <Calendar
        mode="range"
        maxDate={maxDate}
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
          const shouldClose = onRangeChange(next)
          if (shouldClose) {
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
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleString('en-US', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

export function TableSearch<TData>({ table, activeFilterId, className }: TableSearchProps<TData>) {
  const tableId = table.options.meta?.tableId ?? 'default'
  const storeColumnFilters = useTableColumnFilters(tableId)
  const [searchValue, setSearchValue] = useState('')
  const [draftNumberFilter, setDraftNumberFilter] = useState<{
    operator: NumberComparisonOperator
    value: string
  }>({
    operator: 'eq',
    value: '',
  })
  const lastNumberColumnIdRef = useRef<string | null>(null)
  const isClearingNumberInputRef = useRef(false)
  const isEditingNumberInputRef = useRef(false)

  const zustandDraft = useTableDateFilterDraft(tableId, activeFilterId ?? '')
  const setZustandDraft = useSetDateFilterDraftAction()

  // Find the active column object
  const activeColumn = table.getAllLeafColumns().find((column) => column.id === activeFilterId)
  const activeTitle = activeColumn ? getColumnTitle(activeColumn, table) : '...'

  // Get config from TanStack metadata
  const meta = activeColumn?.columnDef.meta
  const activeColumnId = activeColumn?.id
  const filterType = meta?.filterType
  const filterOptions = meta?.filterOptions
  const activeFilterValue = activeColumn?.getFilterValue()
  const storeActiveFilterValue = useMemo(() => {
    if (!activeFilterId) return undefined
    return storeColumnFilters.find((f) => f.id === activeFilterId)?.value
  }, [storeColumnFilters, activeFilterId])
  const tableActiveFilterStringValue =
    typeof activeFilterValue === 'string' ? activeFilterValue : undefined
  const storeActiveFilterStringValue =
    typeof storeActiveFilterValue === 'string' ? storeActiveFilterValue : undefined
  const activeFilterValueKey = useMemo(() => {
    try {
      return JSON.stringify(activeFilterValue ?? null)
    } catch {
      return String(activeFilterValue ?? null)
    }
  }, [activeFilterValue])

  // Sync input with table filter state
  useEffect(() => {
    requestAnimationFrame(() => {
      if (!activeColumn) {
        lastNumberColumnIdRef.current = null
        isClearingNumberInputRef.current = false
        isEditingNumberInputRef.current = false
        setSearchValue('')
        setDraftNumberFilter({ operator: 'eq', value: '' })
        return
      }

      const currentFilterValue = activeColumn.getFilterValue()

      if (filterType === 'date') {
        setSearchValue('')
        const parsed = isDateRangeFilter(currentFilterValue)
          ? normalizeDateRange(currentFilterValue)
          : {}
        const hasAppliedDate = hasDateRangeValue(parsed)
        const hasDraftDate = hasDateRangeValue(zustandDraft)
        const isDraftSameAsApplied =
          parsed.from === zustandDraft?.from && parsed.to === zustandDraft?.to

        // Only hydrate draft from applied value when there is no local draft in progress.
        if (hasAppliedDate && !hasDraftDate && !isDraftSameAsApplied && activeFilterId) {
          setZustandDraft(tableId, activeFilterId, toDateRangeFilter(parsed.from, parsed.to))
        }
        if (!hasAppliedDate && !hasDraftDate && zustandDraft === null && activeFilterId) {
          setZustandDraft(tableId, activeFilterId, {})
        }
        return
      }

      if (filterType === 'number-comparison') {
        setSearchValue('')
        const parsed = isNumberComparisonFilter(currentFilterValue) ? currentFilterValue : null
        const hasSwitchedNumberColumn = lastNumberColumnIdRef.current !== activeColumn.id

        if (hasSwitchedNumberColumn) {
          lastNumberColumnIdRef.current = activeColumn.id
          isClearingNumberInputRef.current = false
          isEditingNumberInputRef.current = false // Reset editing state on column switch
          setDraftNumberFilter(
            parsed
              ? { operator: parsed.operator, value: String(parsed.value) }
              : { operator: 'eq', value: '' },
          )
          return
        }

        if (isClearingNumberInputRef.current) {
          if (parsed) {
            return
          }
          isClearingNumberInputRef.current = false
          setDraftNumberFilter((prev) => (prev.value === '' ? prev : { ...prev, value: '' }))
          return
        }

        // While user is typing/backspacing, keep local draft untouched.
        if (isEditingNumberInputRef.current) {
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

        // Keep local in-progress numeric typing (e.g. "50." -> "50.2") from being
        // overwritten by the parsed applied value ("50") during debounce cycles.
        if (
          parsed &&
          draftNumberFilter.value.trim() !== '' &&
          Number(draftNumberFilter.value) === parsed.value &&
          draftNumberFilter.operator === parsed.operator
        ) {
          return
        }

        // If the applied filter value is different from the current draft, update the draft.
        // This handles cases where the filter is cleared externally or changed by another component.
        if (
          parsed &&
          (draftNumberFilter.operator !== parsed.operator ||
            draftNumberFilter.value !== String(parsed.value))
        ) {
          setDraftNumberFilter({
            operator: parsed.operator,
            value: String(parsed.value),
          })
        } else if (
          !parsed &&
          (draftNumberFilter.operator !== 'eq' || draftNumberFilter.value !== '')
        ) {
          // If no filter is applied, but draft is not empty, reset draft.
          setDraftNumberFilter({ operator: 'eq', value: '' })
        }
        return
      }

      // For other filter types (text, select, boolean)
      lastNumberColumnIdRef.current = null
      isClearingNumberInputRef.current = false
      isEditingNumberInputRef.current = false
      if (filterType === 'select' || filterType === 'boolean') {
        const source =
          storeActiveFilterStringValue ?? tableActiveFilterStringValue ?? currentFilterValue
        setSearchValue(source === undefined || source === null ? '' : String(source))
      } else {
        setSearchValue(
          currentFilterValue === undefined || currentFilterValue === null
            ? ''
            : String(currentFilterValue),
        )
      }
    })
  }, [
    activeColumn,
    activeFilterId,
    activeFilterValueKey, // Use key to detect changes in complex objects
    filterType,
    storeActiveFilterStringValue,
    tableActiveFilterStringValue,
    tableId,
    setZustandDraft,
    zustandDraft,
    zustandDraft?.from,
    zustandDraft?.to,
    draftNumberFilter.operator, // Add draftNumberFilter dependencies for number-comparison logic
    draftNumberFilter.value,
  ])

  const handleSearchChange = (value: string) => {
    const normalizedValue = normalizeSearchInputByColumn(activeColumn?.id, value)
    setSearchValue(normalizedValue)
    if (activeColumn) {
      activeColumn.setFilterValue(normalizedValue === '' ? undefined : normalizedValue)
    }
  }

  useEffect(() => {
    if (!activeColumnId || filterType !== 'number-comparison') return

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
  }, [table, activeColumnId, filterType, draftNumberFilter.operator, draftNumberFilter.value])

  const { selectedRange, previewRange, label } = useMemo(() => {
    if (filterType !== 'date') return { selectedRange: {}, previewRange: {}, label: '' }

    const appliedRange = isDateRangeFilter(activeFilterValue) ? activeFilterValue : {}
    const previewRange = zustandDraft?.from || zustandDraft?.to ? zustandDraft : appliedRange

    const sRange: CalendarRangeSelection = {}
    if (previewRange.from) sRange.from = new Date(`${previewRange.from}T00:00:00`)
    if (previewRange.to) sRange.to = new Date(`${previewRange.to}T00:00:00`)

    let displayLabel = 'Pick a date'
    if (previewRange.from && previewRange.to) {
      displayLabel = `${formatDateDisplay(previewRange.from)} - ${formatDateDisplay(previewRange.to)}`
    } else if (previewRange.from) {
      displayLabel = formatDateDisplay(previewRange.from)
    }

    return { selectedRange: sRange, previewRange, label: displayLabel }
  }, [filterType, activeFilterValue, zustandDraft])

  const selectValue =
    filterType === 'select' || filterType === 'boolean'
      ? (tableActiveFilterStringValue ?? storeActiveFilterStringValue ?? searchValue)
      : ''

  if (!activeColumn) {
    return null
  }

  // Explicitly show nothing for unsupported types in search bar
  if (filterType === 'number-comparison') {
    return (
      <div className={cn('flex flex-1 max-w-sm items-center gap-2', className)}>
        <Select
          value={draftNumberFilter.operator}
          onValueChange={(value) => {
            const operator = value as NumberComparisonOperator
            if (operator === 'eq' || operator === 'lt' || operator === 'gt') {
              isEditingNumberInputRef.current = true
              setDraftNumberFilter((prev) => {
                const next = { ...prev, operator }
                if (activeColumnId) {
                  applyNumberComparisonFilter(table, activeColumnId, next.operator, next.value)
                }
                return next
              })
            }
          }}
        >
          <Select.Trigger className="w-40 h-11 bg-zinc-50/50 border-zinc-200 hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all rounded-xl text-[13px] font-medium">
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
        </Select>

        <Input
          type="text"
          inputMode="decimal"
          id="docTotalFilterValue"
          name="docTotalFilterValue"
          value={draftNumberFilter.value}
          onChange={(event) => {
            const nextValue = normalizeDocTotalInput(event.target.value)
            isClearingNumberInputRef.current = nextValue.trim() === ''
            isEditingNumberInputRef.current = true
            setDraftNumberFilter((prev) => ({ ...prev, value: nextValue }))
            if (nextValue.trim() === '' && activeColumnId) {
              applyNumberComparisonFilter(table, activeColumnId, draftNumberFilter.operator, '')
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
          <Popover.Trigger asChild>
            <button className="w-full min-w-85 h-11 bg-zinc-50/50 border border-zinc-200 hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all duration-200 ease-out rounded-xl text-[13px] font-medium px-3 text-left flex items-center active:scale-[0.99] cursor-pointer">
              <span
                className={cn('truncate', previewRange.from ? 'text-zinc-900' : 'text-zinc-400')}
              >
                {label}
              </span>
            </button>
          </Popover.Trigger>
          <Popover.Content align="start" className="p-0 will-change-transform" unstyled>
            <DateCalendarPanel
              selectedRange={selectedRange}
              onRangeChange={(next) => {
                if (!activeFilterId) return false
                setZustandDraft(tableId, activeFilterId, next)
                const normalized = normalizeDateRange(next)
                if (!normalized.from && !normalized.to) {
                  activeColumn.setFilterValue(undefined)
                  return false
                }
                if (!normalized.from || !normalized.to) {
                  activeColumn.setFilterValue(undefined)
                  return false
                }
                activeColumn.setFilterValue({
                  from: normalized.from,
                  to: normalized.to,
                })
                return true
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
        <Select value={selectValue} onValueChange={handleSearchChange}>
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
                  {Array.isArray(filterOptions) &&
                    (filterOptions as SelectOption[]).map((option: SelectOption | string) => {
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
                            className="size-4 text-zinc-400"
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

                      return (
                        <Select.Item key={value} value={value}>
                          <div className="flex items-center gap-2">
                            {icon}
                            {labelText}
                          </div>
                        </Select.Item>
                      )
                    })}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select>
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
        onChange={(event) => handleSearchChange(event.target.value)}
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
