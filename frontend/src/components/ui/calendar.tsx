import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/utils/cn'
import { MOTION_EASING, MOTION_MS } from '@/utils/motion'

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

type CalendarMode = 'single' | 'range'
export type CalendarDateRange = { from?: Date | undefined; to?: Date | undefined }
export type DateRange = CalendarDateRange

export interface CalendarProps {
  className?: string
  mode?: CalendarMode
  selected?: Date | CalendarDateRange | DateRange
  onSelect?: (value: Date | CalendarDateRange | DateRange | undefined) => void
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
  numberOfMonths: _numberOfMonths = 1,
  showMonthAndYearPickers = true,
  ...props
}: CalendarProps) {
  const today = normalizeDate(new Date())
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

  useEffect(() => {
    if (!selected) {
      setInternalSingle(undefined)
      setInternalRange({})
      return
    }
    if (selected instanceof Date) {
      setInternalSingle(selected)
      setCurrentDate(selected)
      return
    }
    if (isCalendarDateRange(selected)) {
      setInternalRange(selected)
      if (selected.from) setCurrentDate(selected.from)
    }
  }, [selected])

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

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const handleNextMonth = () => {
    const nextMonthDate = new Date(year, month + 1, 1)
    if (normalizeDate(nextMonthDate) > new Date(today.getFullYear(), today.getMonth(), 1)) return
    setCurrentDate(nextMonthDate)
  }
  const handleToggleView = () => {
    if (!showMonthAndYearPickers) return
    setView((prev) => (prev === 'grid' ? 'picker' : 'grid'))
  }

  const handleSelectDate = (day: number) => {
    const clicked = normalizeDate(new Date(year, month, day))
    if (clicked > today) return

    if (mode === 'single') {
      setInternalSingle(clicked)
      onSelect?.(clicked)
      return
    }

    const current = internalRange
    if (!current.from || (current.from && current.to)) {
      const next: CalendarDateRange = { from: clicked }
      setInternalRange(next)
      onSelect?.(next)
      return
    }

    if (current.from && !current.to) {
      const from = normalizeDate(current.from)
      const to = clicked
      const next = from <= to ? { from, to } : { from: to, to: from }
      setInternalRange(next)
      onSelect?.(next)
      return
    }
  }

  const years = Array.from(
    { length: today.getFullYear() - MIN_YEAR + 1 },
    (_, i) => today.getFullYear() - i,
  )
  const currentMonthBoundary = new Date(today.getFullYear(), today.getMonth(), 1)

  const monthScrollRef = useRef<HTMLDivElement>(null)
  const yearScrollRef = useRef<HTMLDivElement>(null)

  // Handle center-snapping when picker opens or selection changes
  useEffect(() => {
    if (view !== 'picker') return

    const ITEM_HEIGHT = 40 // h-10
    const GAP = 8 // gap-2
    const CONTAINER_HEIGHT = 228
    const PADDING = 120 // py-[120px]

    const scrollToItem = (ref: React.RefObject<HTMLDivElement | null>, index: number) => {
      if (!ref.current) return
      const itemCenter = PADDING + index * (ITEM_HEIGHT + GAP) + ITEM_HEIGHT / 2
      const scrollTop = itemCenter - CONTAINER_HEIGHT / 2
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

  return (
    <div
      className={cn(
        'relative w-[272px] bg-white text-zinc-900 rounded-2xl p-2.5 shadow-[0_14px_30px_-20px_rgba(59,130,246,0.35)] border border-blue-100 font-sans select-none overflow-hidden',
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-4 relative z-10">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-2 rounded-full hover:bg-blue-50 transition-colors text-blue-300 hover:text-blue-600 cursor-pointer"
          disabled={view === 'picker'}
        >
          <ChevronLeft size={20} className={cn(view === 'picker' && 'opacity-0')} />
        </button>

        <button
          type="button"
          onClick={handleToggleView}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-all text-sm font-semibold bg-blue-50 border border-blue-100 text-blue-700 cursor-pointer"
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
          className="p-2 rounded-lg hover:bg-blue-50 transition-colors text-blue-300 hover:text-blue-600 cursor-pointer"
          disabled={
            view === 'picker' || normalizeDate(new Date(year, month, 1)) >= currentMonthBoundary
          }
        >
          <ChevronRight
            size={20}
            className={cn(
              (view === 'picker' ||
                normalizeDate(new Date(year, month, 1)) >= currentMonthBoundary) &&
                'opacity-30',
            )}
          />
        </button>
      </div>

      <div className="h-[228px] relative">
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
              {DAYS.map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-blue-300 py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1 flex-1 content-start">
              {days.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />

                const d = new Date(year, month, day)
                const isFuture = normalizeDate(d) > today
                const isToday = sameDay(d, today)
                const isSelectedSingle =
                  mode === 'single' && internalSingle ? sameDay(d, internalSingle) : false
                const from = mode === 'range' ? internalRange.from : undefined
                const to = mode === 'range' ? internalRange.to : undefined
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
                      disabled={isFuture}
                      className={cn(
                        'w-9 h-9 flex items-center justify-center rounded-xl text-sm transition-all',
                        isFuture
                          ? 'text-zinc-300 cursor-not-allowed'
                          : 'hover:bg-blue-50 hover:text-blue-700 active:scale-95 cursor-pointer',
                        isToday && 'border border-blue-200',
                        (isSelectedSingle || isRangeStartOnly || isRangeEdge) &&
                          'bg-blue-50 border border-blue-200 text-blue-700 font-bold shadow-sm',
                        isRangeMiddle && 'bg-blue-50/50 text-blue-500 font-semibold',
                        !isFuture &&
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
              className="flex-1 overflow-y-auto py-[120px] scroll-smooth"
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="flex flex-col items-center gap-2">
                {MONTHS.map((m, index) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setCurrentDate(new Date(year, index, 1))
                      setView('grid')
                    }}
                    disabled={year === today.getFullYear() && index > today.getMonth()}
                    className={cn(
                      'h-10 w-full flex items-center justify-center z-10 transition-colors cursor-pointer',
                      year === today.getFullYear() &&
                        index > today.getMonth() &&
                        'text-zinc-300 cursor-not-allowed',
                      index === month ? 'text-blue-700 font-bold text-lg' : 'text-blue-300',
                    )}
                    style={{
                      transitionDuration: `${MOTION_MS.calendarList}ms`,
                      transitionTimingFunction: MOTION_EASING.smoothOut,
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div
              ref={yearScrollRef}
              className="flex-1 overflow-y-auto py-[120px] scroll-smooth"
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="flex flex-col items-center gap-2">
                {years.map((y, _index) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setCurrentDate(new Date(y, month, 1))
                      setView('grid')
                    }}
                    className={cn(
                      'h-10 w-full flex items-center justify-center z-10 transition-colors cursor-pointer',
                      y === year ? 'text-blue-700 font-bold text-lg' : 'text-blue-300',
                    )}
                    style={{
                      transitionDuration: `${MOTION_MS.calendarList}ms`,
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
