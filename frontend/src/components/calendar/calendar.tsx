import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useReducer } from "react";

import { cn } from "@/shared/utils/cn";
import { MOTION_EASING, MOTION_MS } from "@/shared/utils/motion";

import { CalendarGrid } from "./calendar-grid";
import { CalendarPicker } from "./calendar-picker";
import { calendarReducer, createCalendarInitialState } from "./calendar.reducer";
import {
  createDaySlots,
  isCalendarDateRange,
  MIN_YEAR,
  MONTHS,
  normalizeDate,
} from "./calendar.shared";
import type { CalendarDateRange, CalendarProps, DateRange } from "./calendar.shared";

/**
 * Calendar: Universal date and range picker for ERP workflows.
 * ARCHITECTURE: Composed of a reducer-managed engine (state) and dual-view (Grid/Picker) layout.
 * STYLING: Enforces premium sapphire-on-white aesthetics with fluid transitions.
 */
function Calendar({
  className,
  mode = "single",
  selected,
  onSelect,
  minDate,
  maxDate,
  showMonthAndYearPickers = true,
  ...props
}: CalendarProps) {
  const today = normalizeDate(new Date());
  const minBoundary = minDate ? normalizeDate(minDate) : undefined;
  const maxBoundary = maxDate ? normalizeDate(maxDate) : undefined;
  const isOutsideBounds = (date: Date) =>
    (minBoundary ? normalizeDate(date) < minBoundary : false) ||
    (maxBoundary ? normalizeDate(date) > maxBoundary : false);
  const [state, dispatch] = useReducer(
    calendarReducer,
    { selected, today },
    ({ selected: selectedValue, today: todayValue }) =>
      createCalendarInitialState(selectedValue, todayValue),
  );

  const selectedTime = useMemo(() => {
    if (selected instanceof Date) {
      return selected.getTime();
    }
    if (selected && typeof selected === "object" && "from" in selected) {
      return `${selected.from?.getTime() || 0}-${selected.to?.getTime() || 0}`;
    }
    return 0;
  }, [selected]);

  const todayTime = today.getTime();

  useEffect(() => {
    if (selected === undefined) {
      return;
    }
    dispatch({ payload: { selected, today }, type: "SYNC_SELECTED" });
  }, [selectedTime, todayTime]);

  const effectiveSingle = selected instanceof Date ? selected : state.internalSingle;
  const effectiveRange = isCalendarDateRange(selected) ? selected : state.internalRange;

  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();

  const daySlots = useMemo(() => createDaySlots(year, month), [year, month]);

  const canGoPrevMonth = minBoundary
    ? normalizeDate(new Date(year, month - 1, 1)).getTime() >=
      new Date(minBoundary.getFullYear(), minBoundary.getMonth(), 1).getTime()
    : true;
  const canGoNextMonth = maxBoundary
    ? normalizeDate(new Date(year, month + 1, 1)).getTime() <=
      new Date(maxBoundary.getFullYear(), maxBoundary.getMonth(), 1).getTime()
    : true;
  const handleSelectDate = (day: number) => {
    const clicked = normalizeDate(new Date(year, month, day));
    if (isOutsideBounds(clicked)) {
      return;
    }
    if (mode === "single") {
      if (!selected) {
        dispatch({ payload: clicked, type: "SET_INTERNAL_SINGLE" });
      }
      onSelect?.(clicked);
      return;
    }

    const current = effectiveRange;
    if (current.from && current.to) {
      const next: CalendarDateRange = { from: clicked };
      if (!selected) {
        dispatch({ payload: next, type: "SET_INTERNAL_RANGE" });
      }
      onSelect?.(next);
      return;
    }

    if (!current.from) {
      const next: CalendarDateRange = { from: clicked };
      if (!selected) {
        dispatch({ payload: next, type: "SET_INTERNAL_RANGE" });
      }
      onSelect?.(next);
      return;
    }

    if (current.from && !current.to) {
      const from = normalizeDate(current.from);
      const to = clicked;
      const next = from <= to ? { from, to } : { from: to, to: from };
      if (!selected) {
        dispatch({ payload: next, type: "SET_INTERNAL_RANGE" });
      }
      onSelect?.(next);
      return;
    }
  };

  const maxYear = maxBoundary ? maxBoundary.getFullYear() : today.getFullYear() + 20;
  const minYear = minBoundary ? Math.max(MIN_YEAR, minBoundary.getFullYear()) : MIN_YEAR;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  return (
    <div
      className={cn(
        "relative w-68 bg-surface text-ink-900 rounded-2xl p-2.5 shadow-[0_14px_30px_-20px_rgba(59,130,246,0.35)] border border-teal-100 font-sans select-none overflow-hidden [-webkit-tap-highlight-color:transparent] [&_button:focus]:outline-none [&_button:focus-visible]:outline-none [&_button:focus]:ring-0 [&_button:focus-visible]:ring-0 [&_button:focus]:shadow-none [&_button:focus-visible]:shadow-none",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-4 relative z-10">
        <button
          type="button"
          onClick={() => dispatch({ type: "PREV_MONTH" })}
          className="p-2 rounded-full hover:bg-teal-50 transition-colors text-teal-300 hover:text-teal-600 cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0"
          disabled={state.view === "picker" || !canGoPrevMonth}
        >
          <ChevronLeft
            size={20}
            className={cn((state.view === "picker" || !canGoPrevMonth) && "opacity-30")}
          />
        </button>

        <button
          type="button"
          onClick={() =>
            dispatch({
              payload: { showMonthAndYearPickers },
              type: "TOGGLE_VIEW",
            })
          }
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-teal-100 transition-all text-sm font-semibold bg-teal-50 border border-teal-100 text-teal-700 cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0"
        >
          <span>
            {MONTHS[month]} {year}
          </span>
          <ChevronDown
            size={14}
            className={cn("transition-transform", state.view === "picker" ? "rotate-180" : "")}
            style={{ transitionDuration: `${MOTION_MS.calendarChevron}ms` }}
          />
        </button>

        <button
          type="button"
          onClick={() => dispatch({ type: "NEXT_MONTH" })}
          className="p-2 rounded-lg hover:bg-teal-50 transition-colors text-teal-300 hover:text-teal-600 cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0"
          disabled={state.view === "picker" || !canGoNextMonth}
        >
          <ChevronRight
            size={20}
            className={cn((state.view === "picker" || !canGoNextMonth) && "opacity-30")}
          />
        </button>
      </div>

      {/* h-72 fits 6 week rows (h-9 days + gaps + weekday labels); h-57 clipped late-month days e.g. Aug 30 */}
      <div className="relative h-72">
        <div
          className={cn(
            "absolute inset-0 transition-all transform",
            state.view === "grid"
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-8 scale-95 pointer-events-none",
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
            "absolute inset-0 transition-all transform",
            state.view === "picker"
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-8 scale-95 pointer-events-none",
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
            onDateChange={(date) => dispatch({ payload: date, type: "SET_CURRENT_DATE" })}
            onSwitchToGrid={() => dispatch({ type: "OPEN_GRID" })}
          />
        </div>
      </div>
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
export type { CalendarDateRange, CalendarProps, DateRange };
export default Calendar;
