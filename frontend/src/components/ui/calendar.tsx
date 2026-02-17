import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/shared/utils/cn'
import { MOTION_EASING, MOTION_MS } from '@/shared/utils/motion'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MIN_YEAR = 1900
const PICKER_ITEM_HEIGHT = 40
const PICKER_ITEM_GAP = 8
const PICKER_CONTAINER_HEIGHT = 228
const PICKER_VERTICAL_PADDING = 120

type CalendarMode = 'single' | 'range'
export type CalendarDateRange = { from?: Date | undefined; to?: Date | undefined }
export type DateRange = CalendarDateRange

export interface CalendarProps {
  className?: string
  mode?: CalendarMode
  selected?: Date | CalendarDateRange | DateRange
  onSelect?: (value: Date | CalendarDateRange | DateRange | undefined) => void
  minDate?: Date | undefined
  maxDate?: Date | undefined
  numberOfMonths?: number
  showMonthAndYearPickers?: boolean
  'aria-label'?: string
}

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()
const normalizeDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const isCalendarDateRange = (
  value: Date | CalendarDateRange | undefined,
): value is CalendarDateRange => Boolean(value) && !(value instanceof Date)
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()
const isBetweenInclusive = (target: Date, from: Date, to: Date) => {
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const z = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  const [start, end] = f <= z ? [f, z] : [z, f]
  return t >= start && t <= end
}

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
  const initialDate =
    selected instanceof Date
      ? selected
      : isCalendarDateRange(selected) && selected.from
        ? selected.from
        : today

  const [currentDate, setCurrentDate] = useState(initialDate)
  const [view, setView] = useState<'grid' | 'picker'>('grid')
  const [internalSingle, setInternalSingle] = useState<Date | undefined>(
    selected instanceof Date ? selected : undefined,
  )
  const [internalRange, setInternalRange] = useState<CalendarDateRange>(
    isCalendarDateRange(selected) ? selected : {},
  )

  const effectiveSingle = selected instanceof Date ? selected : internalSingle
  const effectiveRange = isCalendarDateRange(selected) ? selected : internalRange

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const days = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month)
    const startDay = getFirstDayOfMonth(year, month)
    const grid: Array<number | null> = []
    for (let i = 0; i < startDay; i += 1) grid.push(null)
    for (let i = 1; i <= daysInMonth; i += 1) grid.push(i)
    return grid
  }, [year, month])

  const canGoPrevMonth = minBoundary
    ? normalizeDate(new Date(year, month - 1, 1)) >=
      new Date(minBoundary.getFullYear(), minBoundary.getMonth(), 1)
    : true
  const canGoNextMonth = maxBoundary
    ? normalizeDate(new Date(year, month + 1, 1)) <=
      new Date(maxBoundary.getFullYear(), maxBoundary.getMonth(), 1)
    : true
  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return
    setCurrentDate(new Date(year, month - 1, 1))
  }
  const handleNextMonth = () => {
    if (!canGoNextMonth) return
    setCurrentDate(new Date(year, month + 1, 1))
  }
  const handleToggleView = () => {
    if (!showMonthAndYearPickers) return
    setView((prev) => (prev === 'grid' ? 'picker' : 'grid'))
  }

  const handleSelectDate = (day: number) => {
    const clicked = normalizeDate(new Date(year, month, day))
    if (isOutsideBounds(clicked)) return
    if (mode === 'single') {
      if (!selected) setInternalSingle(clicked)
      onSelect?.(clicked)
      return
    }

    const current = effectiveRange
    if (current.from && current.to) {
      const next: CalendarDateRange = { from: clicked }
      if (!selected) setInternalRange(next)
      onSelect?.(next)
      return
    }

    if (!current.from) {
      const next: CalendarDateRange = { from: clicked }
      if (!selected) setInternalRange(next)
      onSelect?.(next)
      return
    }

    if (current.from && !current.to) {
      const from = normalizeDate(current.from)
      const to = clicked
      const next = from <= to ? { from, to } : { from: to, to: from }
      if (!selected) setInternalRange(next)
      onSelect?.(next)
      return
    }
  }

  const maxYear = maxBoundary ? maxBoundary.getFullYear() : today.getFullYear() + 20
  const minYear = minBoundary ? Math.max(MIN_YEAR, minBoundary.getFullYear()) : MIN_YEAR
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i)

  const monthScrollRef = useRef<HTMLDivElement>(null)
  const yearScrollRef = useRef<HTMLDivElement>(null)
  const monthScrollRafRef = useRef<number | null>(null)
  const yearScrollRafRef = useRef<number | null>(null)
  const monthScrollEndTimerRef = useRef<number | null>(null)
  const yearScrollEndTimerRef = useRef<number | null>(null)
  const hasSyncedPickerOpenRef = useRef(false)
  const [isPickerScrolling, setIsPickerScrolling] = useState(false)

  // Handle center-snapping when picker opens or selection changes
  useEffect(() => {
    if (view !== 'picker') {
      hasSyncedPickerOpenRef.current = false
      return
    }
    if (hasSyncedPickerOpenRef.current) return
    hasSyncedPickerOpenRef.current = true

    const scrollToItem = (ref: React.RefObject<HTMLDivElement | null>, index: number) => {
      if (!ref.current) return
      const itemCenter =
        PICKER_VERTICAL_PADDING +
        index * (PICKER_ITEM_HEIGHT + PICKER_ITEM_GAP) +
        PICKER_ITEM_HEIGHT / 2
      const scrollTop = itemCenter - PICKER_CONTAINER_HEIGHT / 2
      ref.current.scrollTo({ top: scrollTop, behavior: 'smooth' })
    }

    // Delay slightly to ensure transition has started
    const timer = setTimeout(() => {
      scrollToItem(monthScrollRef, month)
      const yearIndex = years.indexOf(year)
      if (yearIndex !== -1) scrollToItem(yearScrollRef, yearIndex)
    }, 50)

    return () => clearTimeout(timer)
  }, [view, month, year, years])

  useEffect(() => {
    return () => {
      if (monthScrollRafRef.current !== null) {
        cancelAnimationFrame(monthScrollRafRef.current)
      }
      if (yearScrollRafRef.current !== null) {
        cancelAnimationFrame(yearScrollRafRef.current)
      }
      if (monthScrollEndTimerRef.current !== null) {
        window.clearTimeout(monthScrollEndTimerRef.current)
      }
      if (yearScrollEndTimerRef.current !== null) {
        window.clearTimeout(yearScrollEndTimerRef.current)
      }
    }
  }, [])

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
          onClick={handlePrevMonth}
          className="p-2 rounded-full hover:bg-blue-50 transition-colors text-blue-300 hover:text-blue-600 cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0"
          disabled={view === 'picker' || !canGoPrevMonth}
        >
          <ChevronLeft
            size={20}
            className={cn((view === 'picker' || !canGoPrevMonth) && 'opacity-30')}
          />
        </button>

        <button
          type="button"
          onClick={handleToggleView}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-all text-sm font-semibold bg-blue-50 border border-blue-100 text-blue-700 cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0"
        >
          <span>
            {MONTHS[month]} {year}
          </span>
          <ChevronDown
            size={14}
            className={cn('transition-transform', view === 'picker' ? 'rotate-180' : '')}
            style={{ transitionDuration: `${MOTION_MS.calendarChevron}ms` }}
          />
        </button>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-2 rounded-lg hover:bg-blue-50 transition-colors text-blue-300 hover:text-blue-600 cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0"
          disabled={view === 'picker' || !canGoNextMonth}
        >
          <ChevronRight
            size={20}
            className={cn((view === 'picker' || !canGoNextMonth) && 'opacity-30')}
          />
        </button>
      </div>

      <div className="h-57 relative">
        <div
          className={cn(
            'absolute inset-0 transition-all transform',
            view === 'grid'
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-8 scale-95 pointer-events-none',
          )}
          style={{
            transitionDuration: `${MOTION_MS.calendarView}ms`,
            transitionTimingFunction: MOTION_EASING.smoothOut,
          }}
        >
          <div className="flex flex-col h-full">
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((day, index) => (
                <div
                  key={`${day}-${index}`}
                  className="text-center text-xs font-semibold text-blue-300 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1 flex-1 content-start">
              {days.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />

                const d = new Date(year, month, day)
                const isDisabledDate = isOutsideBounds(d)
                const isToday = sameDay(d, today)
                const isSelectedSingle =
                  mode === 'single' && effectiveSingle ? sameDay(d, effectiveSingle) : false
                const from = mode === 'range' ? effectiveRange.from : undefined
                const to = mode === 'range' ? effectiveRange.to : undefined
                const isRangeStartOnly = Boolean(from && !to && sameDay(d, from))
                const isRangeEdge = Boolean(from && to && (sameDay(d, from) || sameDay(d, to)))
                const isRangeMiddle = Boolean(
                  from && to && !isRangeEdge && isBetweenInclusive(d, from, to),
                )

                return (
                  <div
                    key={`day-${day}`}
                    className="flex items-center justify-center aspect-square"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectDate(day)}
                      disabled={isDisabledDate}
                      className={cn(
                        'w-9 h-9 flex items-center justify-center rounded-xl text-sm appearance-none transition-colors duration-150 focus:outline-none focus-visible:outline-none focus:ring-0',
                        isDisabledDate
                          ? 'text-zinc-300 cursor-not-allowed'
                          : 'hover:bg-blue-50 hover:text-blue-700 active:scale-95 cursor-pointer',
                        isToday && 'ring-1 ring-blue-200',
                        (isSelectedSingle || isRangeStartOnly || isRangeEdge) &&
                          'bg-blue-50 ring-1 ring-blue-200 text-blue-700 font-bold shadow-sm',
                        isRangeMiddle && 'bg-blue-50/50 text-blue-500 font-semibold',
                        !isDisabledDate &&
                          !isSelectedSingle &&
                          !isRangeStartOnly &&
                          !isRangeEdge &&
                          !isRangeMiddle &&
                          'text-zinc-800 font-medium',
                      )}
                      style={{
                        transitionDuration: `${MOTION_MS.calendarCell}ms`,
                        transitionTimingFunction: MOTION_EASING.smoothOut,
                      }}
                    >
                      {day}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'absolute inset-0 transition-all transform',
            view === 'picker'
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 -translate-y-8 scale-95 pointer-events-none',
          )}
          style={{
            transitionDuration: `${MOTION_MS.calendarView}ms`,
            transitionTimingFunction: MOTION_EASING.smoothOut,
          }}
        >
          <div className="flex h-full relative">
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-10 bg-blue-50 rounded-xl mx-2 pointer-events-none z-0 border border-blue-100" />

            <div
              ref={monthScrollRef}
              onScroll={() => {
                setIsPickerScrolling(true)
                if (monthScrollEndTimerRef.current !== null) {
                  window.clearTimeout(monthScrollEndTimerRef.current)
                }
                monthScrollEndTimerRef.current = window.setTimeout(() => {
                  setIsPickerScrolling(false)
                }, 140)
                if (monthScrollRafRef.current !== null) return
                monthScrollRafRef.current = requestAnimationFrame(() => {
                  monthScrollRafRef.current = null
                  const container = monthScrollRef.current
                  if (!container) return

                  const step = PICKER_ITEM_HEIGHT + PICKER_ITEM_GAP
                  const centerOffset =
                    container.scrollTop + PICKER_CONTAINER_HEIGHT / 2 - PICKER_VERTICAL_PADDING
                  const monthIndex = Math.round((centerOffset - PICKER_ITEM_HEIGHT / 2) / step)
                  const clampedMonth = Math.max(0, Math.min(11, monthIndex))
                  const minMonthForYear =
                    minBoundary && year === minBoundary.getFullYear() ? minBoundary.getMonth() : 0
                  const maxMonthForYear =
                    maxBoundary && year === maxBoundary.getFullYear() ? maxBoundary.getMonth() : 11
                  const nextMonth = Math.max(
                    minMonthForYear,
                    Math.min(clampedMonth, maxMonthForYear),
                  )

                  if (nextMonth !== month) {
                    setCurrentDate(new Date(year, nextMonth, 1))
                  }
                })
              }}
              className="flex-1 overflow-y-auto py-30 scroll-smooth"
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="flex flex-col items-center gap-2">
                {MONTHS.map((m, index) => {
                  const beforeMin =
                    minBoundary &&
                    (year < minBoundary.getFullYear() ||
                      (year === minBoundary.getFullYear() && index < minBoundary.getMonth()))
                  const afterMax =
                    maxBoundary &&
                    (year > maxBoundary.getFullYear() ||
                      (year === maxBoundary.getFullYear() && index > maxBoundary.getMonth()))
                  const isMonthDisabled = Boolean(beforeMin || afterMax)

                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setCurrentDate(new Date(year, index, 1))
                        setView('grid')
                      }}
                      disabled={isMonthDisabled}
                      className={cn(
                        'h-10 w-full flex items-center justify-center z-10 transition-colors cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0',
                        isMonthDisabled && 'text-zinc-300 cursor-not-allowed',
                        index === month ? 'text-blue-700 font-bold text-lg' : 'text-blue-300',
                      )}
                      style={{
                        transitionDuration: isPickerScrolling
                          ? '0ms'
                          : `${MOTION_MS.calendarList}ms`,
                        transitionTimingFunction: MOTION_EASING.smoothOut,
                      }}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>

            <div
              ref={yearScrollRef}
              onScroll={() => {
                setIsPickerScrolling(true)
                if (yearScrollEndTimerRef.current !== null) {
                  window.clearTimeout(yearScrollEndTimerRef.current)
                }
                yearScrollEndTimerRef.current = window.setTimeout(() => {
                  setIsPickerScrolling(false)
                }, 140)
                if (yearScrollRafRef.current !== null) return
                yearScrollRafRef.current = requestAnimationFrame(() => {
                  yearScrollRafRef.current = null
                  const container = yearScrollRef.current
                  if (!container) return

                  const step = PICKER_ITEM_HEIGHT + PICKER_ITEM_GAP
                  const centerOffset =
                    container.scrollTop + PICKER_CONTAINER_HEIGHT / 2 - PICKER_VERTICAL_PADDING
                  const yearIndex = Math.round((centerOffset - PICKER_ITEM_HEIGHT / 2) / step)
                  const clampedIndex = Math.max(0, Math.min(years.length - 1, yearIndex))
                  const nextYear = years[clampedIndex]
                  if (!nextYear) return

                  const minMonthForYear =
                    minBoundary && nextYear === minBoundary.getFullYear()
                      ? minBoundary.getMonth()
                      : 0
                  const maxMonthForYear =
                    maxBoundary && nextYear === maxBoundary.getFullYear()
                      ? maxBoundary.getMonth()
                      : 11
                  const nextMonth = Math.max(minMonthForYear, Math.min(month, maxMonthForYear))

                  if (nextYear !== year || nextMonth !== month) {
                    setCurrentDate(new Date(nextYear, nextMonth, 1))
                  }
                })
              }}
              className="flex-1 overflow-y-auto py-30 scroll-smooth"
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="flex flex-col items-center gap-2">
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setCurrentDate(new Date(y, month, 1))
                      setView('grid')
                    }}
                    className={cn(
                      'h-10 w-full flex items-center justify-center z-10 transition-colors cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0',
                      y === year ? 'text-blue-700 font-bold text-lg' : 'text-blue-300',
                    )}
                    style={{
                      transitionDuration: isPickerScrolling ? '0ms' : `${MOTION_MS.calendarList}ms`,
                      transitionTimingFunction: MOTION_EASING.smoothOut,
                    }}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

Calendar.displayName = 'Calendar'

export { Calendar }
export default Calendar
