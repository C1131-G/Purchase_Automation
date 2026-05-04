import { Calendar as LucideCalendar } from 'lucide-react'
import { useMemo } from 'react'

import { Calendar } from '@/components/calendar/calendar'
import { usePopover } from '@/components/context/popover-context'
import { Popover } from '@/components/popover'
import {
  type DateRangeFilter,
  isDateRangeFilter,
  normalizeDateRange,
  toDateRangeFilter,
} from '@/features/table-pages/table-shared/utils/table-filter-values'
import { cn } from '@/shared/utils/cn'
import { MOTION_MS } from '@/shared/utils/motion'

import { type DateFilterSearchProps } from './table-search.types'
import { formatDateDisplay, toDateOnly } from './table-search.utils'

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
        onSelect={(value: unknown) => {
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

export function DateFilterSearch<TData>({
  activeColumn,
  activeColumnId,
  activeFilterValue,
  zustandDraft,
  tableId,
  setZustandDraft,
  className,
}: DateFilterSearchProps<TData>) {
  const { selectedRange, previewRange, label } = useMemo(() => {
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
  }, [activeFilterValue, zustandDraft])

  return (
    <div className={cn('w-full', className)}>
      <Popover.Root>
        <Popover.Trigger asChild className="w-full">
          <button className="w-full h-11 bg-zinc-50/50 border border-zinc-200 hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all duration-200 ease-out rounded-xl text-[13px] font-normal pl-4 pr-10 text-left flex items-center justify-between active:scale-[0.99] cursor-pointer group relative">
            <span className={cn('truncate', previewRange.from ? 'text-zinc-900' : 'text-zinc-400')}>
              {label === 'Pick a date' ? 'Select Date...' : label}
            </span>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <LucideCalendar className="size-3.5 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            </div>
          </button>
        </Popover.Trigger>
        <Popover.Content align="start" className="p-0 will-change-transform" unstyled>
          <DateCalendarPanel
            selectedRange={selectedRange}
            onRangeChange={(next) => {
              setZustandDraft(tableId, activeColumnId, next)
              const normalized = normalizeDateRange(next)
              if (!normalized.from && !normalized.to) {
                activeColumn.setFilterValue(undefined)
                return false
              }
              if (!normalized.from || !normalized.to) {
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
