import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useReducer } from 'react'

import { cn } from '@/shared/utils/cn'
import { MOTION_EASING, MOTION_MS } from '@/shared/utils/motion'

import { calendarReducer, createCalendarInitialState } from './calendar.reducer'
import {
  type CalendarDateRange,
  type CalendarProps,
  createDaySlots,
  type DateRange,
  isCalendarDateRange,
  MIN_YEAR,
  MONTHS,
  normalizeDate,
} from './calendar.shared'
import { CalendarGrid } from './calendar-grid'
import { CalendarPicker } from './calendar-picker'

function Calendar({
  className,
  mode = 'single',
  selected,
  onSelect,
  minDate,
  maxDate,
  showMonthAndYearPickers = true,
  ...props
}: CalendarProps) {
  const today = normalizeDate(new Date())
  const minBoundary = minDate ? normalizeDate(minDate) : undefined
  const maxBoundary = maxDate ? normalizeDate(maxDate) : undefined
  const isOutsideBounds = (date: Date) =>
    (minBoundary ? normalizeDate(date) < minBoundary : false) ||
    (maxBoundary ? normalizeDate(date) > maxBoundary : false)
  const [state, dispatch] = useReducer(
    calendarReducer,
    { selected, today },
    ({ selected: selectedValue, today: todayValue }) =>
      createCalendarInitialState(selectedValue, todayValue),
  )

  useEffect(() => {
    if (selected === undefined) return
    dispatch({ type: 'SYNC_SELECTED', payload: { selected, today } })
  }, [selected, today])

  const effectiveSingle = selected instanceof Date ? selected : state.internalSingle
  const effectiveRange = isCalendarDateRange(selected) ? selected : state.internalRange

  const year = state.currentDate.getFullYear()
  const month = state.currentDate.getMonth()

  const daySlots = useMemo(() => createDaySlots(year, month), [year, month])

  const canGoPrevMonth = minBoundary
    ? normalizeDate(new Date(year, month - 1, 1)) >=
      new Date(minBoundary.getFullYear(), minBoundary.getMonth(), 1)
    : true
  const canGoNextMonth = maxBoundary
    ? normalizeDate(new Date(year, month + 1, 1)) <=
      new Date(maxBoundary.getFullYear(), maxBoundary.getMonth(), 1)
    : true
  const handleSelectDate = (day: number) => {
    const clicked = normalizeDate(new Date(year, month, day))
    if (isOutsideBounds(clicked)) return
    if (mode === 'single') {
      if (!selected) {
        dispatch({ type: 'SET_INTERNAL_SINGLE', payload: clicked })
      }
      onSelect?.(clicked)
      return
    }

    const current = effectiveRange
    if (current.from && current.to) {
      const next: CalendarDateRange = { from: clicked }
      if (!selected) {
        dispatch({ type: 'SET_INTERNAL_RANGE', payload: next })
      }
      onSelect?.(next)
      return
    }

    if (!current.from) {
      const next: CalendarDateRange = { from: clicked }
      if (!selected) {
        dispatch({ type: 'SET_INTERNAL_RANGE', payload: next })
      }
      onSelect?.(next)
      return
    }

    if (current.from && !current.to) {
      const from = normalizeDate(current.from)
      const to = clicked
      const next = from <= to ? { from, to } : { from: to, to: from }
      if (!selected) {
        dispatch({ type: 'SET_INTERNAL_RANGE', payload: next })
      }
      onSelect?.(next)
      return
    }
  }

  const maxYear = maxBoundary ? maxBoundary.getFullYear() : today.getFullYear() + 20
  const minYear = minBoundary ? Math.max(MIN_YEAR, minBoundary.getFullYear()) : MIN_YEAR
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i)

  return (
    <div
      className={cn(
        'relative w-68 bg-white text-zinc-900 rounded-2xl p-2.5 shadow-[0_14px_30px_-20px_rgba(59,130,246,0.35)] border border-blue-100 font-sans select-none overflow-hidden [-webkit-tap-highlight-color:transparent] [&_button:focus]:outline-none [&_button:focus-visible]:outline-none [&_button:focus]:ring-0 [&_button:focus-visible]:ring-0 [&_button:focus]:shadow-none [&_button:focus-visible]:shadow-none',
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-4 relative z-10">
        <button
          type="button"
          onClick={() => dispatch({ type: 'PREV_MONTH' })}
          className="p-2 rounded-full hover:bg-blue-50 transition-colors text-blue-300 hover:text-blue-600 cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0"
          disabled={state.view === 'picker' || !canGoPrevMonth}
        >
          <ChevronLeft
            size={20}
            className={cn((state.view === 'picker' || !canGoPrevMonth) && 'opacity-30')}
          />
        </button>

        <button
          type="button"
          onClick={() =>
            dispatch({
              type: 'TOGGLE_VIEW',
              payload: { showMonthAndYearPickers },
            })
          }
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-all text-sm font-semibold bg-blue-50 border border-blue-100 text-blue-700 cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0"
        >
          <span>
            {MONTHS[month]} {year}
          </span>
          <ChevronDown
            size={14}
            className={cn('transition-transform', state.view === 'picker' ? 'rotate-180' : '')}
            style={{ transitionDuration: `${MOTION_MS.calendarChevron}ms` }}
          />
        </button>

        <button
          type="button"
          onClick={() => dispatch({ type: 'NEXT_MONTH' })}
          className="p-2 rounded-lg hover:bg-blue-50 transition-colors text-blue-300 hover:text-blue-600 cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0"
          disabled={state.view === 'picker' || !canGoNextMonth}
        >
          <ChevronRight
            size={20}
            className={cn((state.view === 'picker' || !canGoNextMonth) && 'opacity-30')}
          />
        </button>
      </div>

      <div className="h-57 relative">
        <div
          className={cn(
            'absolute inset-0 transition-all transform',
            state.view === 'grid'
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-8 scale-95 pointer-events-none',
          )}
          style={{
            transitionDuration: `${MOTION_MS.calendarView}ms`,
            transitionTimingFunction: MOTION_EASING.smoothOut,
          }}
        >
          <CalendarGrid
            daySlots={daySlots}
            year={year}
            month={month}
            today={today}
            mode={mode}
            effectiveSingle={effectiveSingle}
            effectiveRange={effectiveRange}
            isOutsideBounds={isOutsideBounds}
            onSelectDate={handleSelectDate}
          />
        </div>

        <div
          className={cn(
            'absolute inset-0 transition-all transform',
            state.view === 'picker'
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 -translate-y-8 scale-95 pointer-events-none',
          )}
          style={{
            transitionDuration: `${MOTION_MS.calendarView}ms`,
            transitionTimingFunction: MOTION_EASING.smoothOut,
          }}
        >
          <CalendarPicker
            view={state.view}
            year={year}
            month={month}
            years={years}
            minBoundary={minBoundary}
            maxBoundary={maxBoundary}
            onDateChange={(date) => dispatch({ type: 'SET_CURRENT_DATE', payload: date })}
            onSwitchToGrid={() => dispatch({ type: 'OPEN_GRID' })}
          />
        </div>
      </div>
    </div>
  )
}

Calendar.displayName = 'Calendar'

export { Calendar }
export type { CalendarDateRange, CalendarProps, DateRange }
export default Calendar
