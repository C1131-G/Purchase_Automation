import {
  Calendar as CalendarIcon,
  Check,
  Filter,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Calendar } from '@/components/calendar/calendar'
import { Input } from '@/components/input/input'
import { Popover } from '@/components/popover'
import { Select } from '@/components/select/select'
import { SuggestionList } from '@/features/create-pages/create-shared/components/core/suggestion-list'
import { type CreateLookupOption } from '@/features/create-pages/create-shared/utils/create-order.types'
import { formatDateDisplay, rankLookupSuggestions, sortLookupByCodeDesc, toNumberComparisonFilter } from '@/features/table-pages/table-shared/components/filters/search/table-search.utils'
import { normalizeDocTotalInput } from '@/features/table-pages/table-shared/components/filters/table-search.validation'
import {
  hasDateRangeValue,
  matchesDateRange,
  matchesNumberComparison,
  toDateRangeFilter,
  type DateRangeFilter,
  type NumberComparisonOperator,
} from '@/features/table-pages/table-shared/utils/table-filter-values'
import { cn } from '@/shared/utils/cn'

export type OutgoingPaymentCreateDocument = {
  id: number
  docNum: string | number
  date: string
  docTotal: number
  balanceDue: number
  totalPayment: number
  type: 'it_PurchaseInvoice' | 'it_PurchCredItnote'
  label: string
}

export type OutgoingPaymentCreateFilterState = {
  docType: 'all' | OutgoingPaymentCreateDocument['type']
  docNumber: string
  docDate: DateRangeFilter
  docTotal: NumberComparisonDraft
  balanceDue: NumberComparisonDraft
  totalPayment: NumberComparisonDraft
}

export type OutgoingPaymentCreateFilterKey =
  | 'docType'
  | 'docNumber'
  | 'docDate'
  | 'docTotal'
  | 'balanceDue'
  | 'totalPayment'

type NumberComparisonDraft = {
  operator: NumberComparisonOperator
  value: string
}

const DOC_TYPE_OPTIONS: Array<{ value: OutgoingPaymentCreateFilterState['docType']; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'it_PurchaseInvoice', label: 'A/P Invoice' },
  { value: 'it_PurchCredItnote', label: 'A/P Credit Memo' },
]

const ACTIVE_FILTER_WIDTH_CLASS = 'w-[240px]'

const defaultComparisonDraft = (): NumberComparisonDraft => ({
  operator: 'eq',
  value: '',
})

export const createOutgoingPaymentCreateFilterState = (): OutgoingPaymentCreateFilterState => ({
  docType: 'all',
  docNumber: '',
  docDate: toDateRangeFilter(),
  docTotal: defaultComparisonDraft(),
  balanceDue: defaultComparisonDraft(),
  totalPayment: defaultComparisonDraft(),
})

export const countOutgoingPaymentCreateFilters = (filters: OutgoingPaymentCreateFilterState) => {
  let count = 0
  if (filters.docType !== 'all') count += 1
  if (filters.docNumber.trim()) count += 1
  if (hasDateRangeValue(filters.docDate)) count += 1
  if (filters.docTotal.value.trim()) count += 1
  if (filters.balanceDue.value.trim()) count += 1
  if (filters.totalPayment.value.trim()) count += 1
  return count
}

export const matchesOutgoingPaymentCreateFilters = (
  document: OutgoingPaymentCreateDocument,
  filters: OutgoingPaymentCreateFilterState,
) => {
  if (filters.docType !== 'all' && document.type !== filters.docType) return false

  const docNumberTerm = filters.docNumber.trim().toLowerCase()
  if (docNumberTerm && !String(document.docNum).toLowerCase().includes(docNumberTerm)) {
    return false
  }

  if (!matchesDateRange(document.date, filters.docDate)) return false

  const docTotalFilter = toNumberComparisonFilter(
    filters.docTotal.operator,
    filters.docTotal.value.trim(),
  )
  if (!matchesNumberComparison(document.docTotal, docTotalFilter)) return false

  const balanceDueFilter = toNumberComparisonFilter(
    filters.balanceDue.operator,
    filters.balanceDue.value.trim(),
  )
  if (!matchesNumberComparison(document.balanceDue, balanceDueFilter)) return false

  const totalPaymentFilter = toNumberComparisonFilter(
    filters.totalPayment.operator,
    filters.totalPayment.value.trim(),
  )
  if (!matchesNumberComparison(document.totalPayment, totalPaymentFilter)) return false

  return true
}

function ComparisonField({
  label,
  value,
  onChange,
  showLabel = true,
}: {
  label: string
  value: NumberComparisonDraft
  onChange: (next: NumberComparisonDraft) => void
  showLabel?: boolean
}) {
  return (
    <div className="space-y-1.5">
      {showLabel ? (
        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {label}
        </label>
      ) : null}
      <div className="flex items-center gap-2">
        <div className="w-[96px] shrink-0">
          <Select
            value={value.operator}
            onValueChange={(nextValue) => {
              const nextOperator = nextValue as NumberComparisonOperator
              if (nextOperator === 'eq' || nextOperator === 'lt' || nextOperator === 'gt') {
                onChange({ ...value, operator: nextOperator })
              }
            }}
          >
            <Select.Trigger className="h-11 w-full rounded-xl border-zinc-200 bg-zinc-50/50 text-[13px] font-normal transition-all hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100">
              <span className="truncate text-zinc-900 font-normal">
                {value.operator === 'eq' ? '=' : value.operator === 'lt' ? '<' : '>'}
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
                    <Select.Item value="eq">=</Select.Item>
                    <Select.Item value="lt">&lt;</Select.Item>
                    <Select.Item value="gt">&gt;</Select.Item>
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select>
        </div>

        <Input
          type="text"
          inputMode="decimal"
          value={value.value}
          onChange={(event) => onChange({ ...value, value: normalizeDocTotalInput(event.target.value) })}
          placeholder="Value..."
          className="h-11 w-full rounded-xl border-zinc-200 bg-zinc-50/50 text-[13px] font-normal transition-all hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      </div>
    </div>
  )
}

function DocDateField({
  value,
  onChange,
  showLabel = true,
}: {
  value: DateRangeFilter
  onChange: (next: DateRangeFilter) => void
  showLabel?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const label = useMemo(() => {
    if (value.from && value.to) {
      return `${formatDateDisplay(value.from)} - ${formatDateDisplay(value.to)}`
    }
    if (value.from) return formatDateDisplay(value.from)
    if (value.to) return formatDateDisplay(value.to)
    return 'Select Date...'
  }, [value.from, value.to])

  const maxDate = useMemo(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), today.getDate())
  }, [])
  const isCalendarRangeSelection = (next: unknown): next is { from?: Date; to?: Date } => {
    if (!next || typeof next !== 'object' || Array.isArray(next)) return false
    const candidate = next as { from?: unknown; to?: unknown }
    const fromValid = candidate.from === undefined || candidate.from instanceof Date
    const toValid = candidate.to === undefined || candidate.to instanceof Date
    return fromValid && toValid
  }

  return (
    <div ref={containerRef} className="relative">
      {showLabel ? (
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Doc Date
        </label>
      ) : null}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'relative flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/50 text-[13px] font-normal text-zinc-800 outline-none transition-all hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100',
          showLabel ? 'pl-4 pr-10' : 'pl-4 pr-10',
        )}
      >
        <span className={cn('truncate', value.from || value.to ? 'text-zinc-900' : 'text-zinc-400')}>
          {label}
        </span>
      </button>
      {hasDateRangeValue(value) ? (
        <button
          type="button"
          aria-label="Clear document date filter"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.stopPropagation()
            onChange({})
          }}
          className={cn(
            'absolute right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100',
            showLabel ? 'top-[31px]' : 'top-1/2 -translate-y-1/2',
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <div
          className={cn(
            'pointer-events-none absolute right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100',
            showLabel ? 'top-[31px]' : 'top-1/2 -translate-y-1/2',
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
        </div>
      )}

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2">
          <Calendar
            mode="range"
            maxDate={maxDate}
            selected={{
              from: value.from ? new Date(`${value.from}T00:00:00`) : undefined,
              to: value.to ? new Date(`${value.to}T00:00:00`) : undefined,
            }}
            onSelect={(next) => {
              if (!next) {
                onChange({})
                return
              }

              if (!isCalendarRangeSelection(next)) return

              const from = next.from ? next.from.toISOString().slice(0, 10) : undefined
              const to = next.to ? next.to.toISOString().slice(0, 10) : undefined
              const nextRange = toDateRangeFilter(from, to)
              onChange(nextRange)
              if (nextRange.from && nextRange.to) {
                setIsOpen(false)
              }
            }}
          />
        </div>
      )}
    </div>
  )
}

function DocNumberField({
  value,
  onChange,
  documents,
  showLabel = true,
}: {
  value: string
  onChange: (next: string) => void
  documents: OutgoingPaymentCreateDocument[]
  showLabel?: boolean
}) {
  const [isFocused, setIsFocused] = useState(false)

  const suggestions = useMemo(() => {
    const seen = new Set<string>()
    const items: CreateLookupOption[] = []

    for (const doc of documents) {
      const code = String(doc.docNum).trim()
      if (!code || seen.has(code)) continue
      seen.add(code)
      items.push({
        code,
        name: `${doc.label}${doc.date ? ` • ${formatDateDisplay(doc.date)}` : ''}`,
      })
    }

    const trimmed = value.trim()
    if (!trimmed) return sortLookupByCodeDesc(items)
    return rankLookupSuggestions(items, trimmed, 'code')
  }, [documents, value])

  return (
    <div className="relative">
      {showLabel ? (
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Doc Number
        </label>
      ) : null}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-zinc-400" />
        </div>
        <Input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          placeholder="Doc number"
          inputMode="numeric"
          className="h-11 w-full rounded-xl border-zinc-200 bg-zinc-50/50 pl-10 pr-10 text-[13px] font-normal transition-all hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear document number filter"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {isFocused ? (
        <SuggestionList
          items={suggestions}
          onSelect={(item) => {
            onChange(item.code)
            setIsFocused(false)
          }}
          floating
          maxHeight="max-h-64"
          containerClassName="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg"
          query={value}
        />
      ) : null}
    </div>
  )
}

export function OutgoingPaymentCreateFilters({
  value,
  onReset,
  activeFilterKey,
  onActiveFilterChange,
}: {
  value: OutgoingPaymentCreateFilterState
  onReset: () => void
  activeFilterKey: OutgoingPaymentCreateFilterKey | null
  onActiveFilterChange: (next: OutgoingPaymentCreateFilterKey | null) => void
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Open outgoing payment filters"
          className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-all active:scale-[0.98] normal-case tracking-normal group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:border-blue-300 cursor-pointer hover:bg-zinc-50 hover:text-blue-600"
        >
          <span>Filter</span>
          <Filter className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 text-zinc-400 group-hover:text-blue-500" />
        </button>
      </Popover.Trigger>

      <OutgoingPaymentCreateFiltersContent
        value={value}
        onReset={onReset}
        activeFilterKey={activeFilterKey}
        onActiveFilterChange={onActiveFilterChange}
      />
    </Popover.Root>
  )
}

function OutgoingPaymentCreateFiltersContent({
  value,
  onReset,
  activeFilterKey,
  onActiveFilterChange,
}: {
  value: OutgoingPaymentCreateFilterState
  onReset: () => void
  activeFilterKey: OutgoingPaymentCreateFilterKey | null
  onActiveFilterChange: (next: OutgoingPaymentCreateFilterKey | null) => void
}) {
  const { setOpen } = Popover.usePopoverContext()
  const filterSections = useMemo(
    () => [
      {
        key: 'docType' as const,
        label: 'Doc Type',
        active: activeFilterKey === 'docType' || value.docType !== 'all',
      },
      {
        key: 'docNumber' as const,
        label: 'Doc Number',
        active: activeFilterKey === 'docNumber' || value.docNumber.trim().length > 0,
      },
      {
        key: 'docDate' as const,
        label: 'Doc Date',
        active: activeFilterKey === 'docDate' || hasDateRangeValue(value.docDate),
      },
      {
        key: 'docTotal' as const,
        label: 'Doc Total',
        active: activeFilterKey === 'docTotal' || value.docTotal.value.trim().length > 0,
      },
      {
        key: 'balanceDue' as const,
        label: 'Balance Due',
        active: activeFilterKey === 'balanceDue' || value.balanceDue.value.trim().length > 0,
      },
      {
        key: 'totalPayment' as const,
        label: 'Total Payment',
        active: activeFilterKey === 'totalPayment' || value.totalPayment.value.trim().length > 0,
      },
    ],
    [activeFilterKey, value],
  )

  return (
    <Popover.Content
      align="end"
      className="w-57.5 p-0 overflow-hidden border border-zinc-200 rounded-xl shadow-xl"
      unstyled
    >
      <div className="flex flex-col bg-white/95 backdrop-blur-xl">
        <div className="px-1.5 py-1.5">
          <div className="flex flex-col gap-px">
            {filterSections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => {
                  onActiveFilterChange(section.key)
                  setOpen(false)
                }}
                className="group flex items-center justify-between rounded-md px-2 py-2 text-[12px] select-none border border-transparent transition-colors hover:bg-zinc-50 text-zinc-900"
              >
                <span
                  className={cn(
                    'truncate transition-colors cursor-pointer text-left flex-1',
                    section.active
                      ? 'text-blue-500 font-medium'
                      : 'text-zinc-700 font-medium hover:text-blue-600',
                  )}
                >
                  {section.label}
                </span>
                <span
                  className={cn(
                    'ml-2 flex items-center justify-center size-4 rounded border transition-all cursor-pointer shrink-0',
                    section.active
                      ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                      : 'border-zinc-300 bg-white text-transparent hover:border-blue-400 hover:bg-blue-50/50',
                  )}
                >
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-100/80 bg-zinc-50/30">
          <button
            type="button"
            onClick={() => {
              onReset()
              setOpen(false)
            }}
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

export function OutgoingPaymentCreateActiveFilter({
  documents,
  value,
  onChange,
  activeFilterKey,
}: {
  documents: OutgoingPaymentCreateDocument[]
  value: OutgoingPaymentCreateFilterState
  onChange: (next: OutgoingPaymentCreateFilterState) => void
  activeFilterKey: OutgoingPaymentCreateFilterKey | null
}) {
  if (!activeFilterKey) return null

  if (activeFilterKey === 'docType') {
    const docTypeSelectValue = value.docType === 'all' ? '' : value.docType
    return (
      <div className={`${ACTIVE_FILTER_WIDTH_CLASS} shrink-0`}>
        <Select
          value={docTypeSelectValue}
          onValueChange={(nextValue) => {
            const docType =
              nextValue === ''
                ? 'all'
                : (nextValue as Exclude<OutgoingPaymentCreateFilterState['docType'], 'all'>)
            onChange({ ...value, docType })
          }}
        >
          <Select.Trigger className="h-11 w-full rounded-xl border-zinc-200 bg-zinc-50/50 text-[13px] font-normal transition-all hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100">
            <Select.Value placeholder="All" />
            <Select.Icon>
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
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.List>
                  {DOC_TYPE_OPTIONS.map((option) => (
                    <Select.Item
                      key={option.value}
                      value={option.value === 'all' ? '' : option.value}
                    >
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select>
      </div>
    )
  }

  if (activeFilterKey === 'docNumber') {
    return (
      <div className={`${ACTIVE_FILTER_WIDTH_CLASS} shrink-0`}>
        <DocNumberField
          value={value.docNumber}
          onChange={(next) => onChange({ ...value, docNumber: next })}
          documents={documents}
          showLabel={false}
        />
      </div>
    )
  }

  if (activeFilterKey === 'docDate') {
    return (
      <div className={`${ACTIVE_FILTER_WIDTH_CLASS} shrink-0`}>
        <DocDateField
          value={value.docDate}
          onChange={(next) => onChange({ ...value, docDate: next })}
          showLabel={false}
        />
      </div>
    )
  }

  if (activeFilterKey === 'docTotal') {
    return (
      <div className={`${ACTIVE_FILTER_WIDTH_CLASS} shrink-0`}>
        <ComparisonField
          label="Doc Total"
          value={value.docTotal}
          onChange={(next) => onChange({ ...value, docTotal: next })}
          showLabel={false}
        />
      </div>
    )
  }

  if (activeFilterKey === 'balanceDue') {
    return (
      <div className={`${ACTIVE_FILTER_WIDTH_CLASS} shrink-0`}>
        <ComparisonField
          label="Balance Due"
          value={value.balanceDue}
          onChange={(next) => onChange({ ...value, balanceDue: next })}
          showLabel={false}
        />
      </div>
    )
  }

  return (
    <div className={`${ACTIVE_FILTER_WIDTH_CLASS} shrink-0`}>
      <ComparisonField
        label="Total Payment"
        value={value.totalPayment}
        onChange={(next) => onChange({ ...value, totalPayment: next })}
        showLabel={false}
      />
    </div>
  )
}
