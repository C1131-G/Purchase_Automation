import { cn } from "@/shared/utils/cn";
import { MOTION_EASING, MOTION_MS } from "@/shared/utils/motion";

import { DAYS, isBetweenInclusive, sameDay } from "./calendar.shared";
import type { CalendarDateRange, CalendarMode, DaySlot } from "./calendar.shared";

interface CalendarGridProps {
  daySlots: DaySlot[];
  year: number;
  month: number;
  today: Date;
  mode: CalendarMode;
  effectiveSingle: Date | undefined;
  effectiveRange: CalendarDateRange;
  isOutsideBounds: (date: Date) => boolean;
  onSelectDate: (day: number) => void;
}

/**
 * CalendarGrid: Renders the 7-column day layout.
 * COORDINATION: Handles day selection and visual state (today, selected, range) calculation.
 */
export function CalendarGrid({
  daySlots,
  year,
  month,
  today,
  mode,
  effectiveSingle,
  effectiveRange,
  isOutsideBounds,
  onSelectDate,
}: CalendarGridProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((day) => (
          <div key={day.id} className="text-center text-xs font-semibold text-teal-300 py-1">
            {day.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 flex-1 content-start">
        {daySlots.map((slot) => {
          if (!slot.day) {
            return <div key={slot.key} />;
          }
          const { day } = slot;

          const d = new Date(year, month, day);
          const isDisabledDate = isOutsideBounds(d);
          const isToday = sameDay(d, today);
          const isSelectedSingle =
            mode === "single" && effectiveSingle ? sameDay(d, effectiveSingle) : false;
          const from = mode === "range" ? effectiveRange.from : undefined;
          const to = mode === "range" ? effectiveRange.to : undefined;
          const isRangeStartOnly = Boolean(from && !to && sameDay(d, from));
          const isRangeEdge = Boolean(from && to && (sameDay(d, from) || sameDay(d, to)));
          const isRangeMiddle = Boolean(
            from && to && !isRangeEdge && isBetweenInclusive(d, from, to),
          );

          return (
            <div key={slot.key} className="flex items-center justify-center aspect-square">
              <button
                type="button"
                onClick={() => onSelectDate(day)}
                disabled={isDisabledDate}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-xl text-sm appearance-none transition-colors duration-150 focus:outline-none focus-visible:outline-none focus:ring-0",
                  isDisabledDate
                    ? "text-neutral-300 cursor-not-allowed"
                    : "hover:bg-teal-50 hover:text-teal-700 active:scale-95 cursor-pointer",
                  isToday && "ring-1 ring-teal-200",
                  (isSelectedSingle || isRangeStartOnly || isRangeEdge) &&
                    "bg-teal-50 ring-1 ring-teal-200 text-teal-700 font-bold shadow-sm",
                  isRangeMiddle && "bg-teal-50/50 text-teal-500 font-semibold",
                  !isDisabledDate &&
                    !isSelectedSingle &&
                    !isRangeStartOnly &&
                    !isRangeEdge &&
                    !isRangeMiddle &&
                    "text-ink-900 font-medium",
                )}
                style={{
                  transitionDuration: `${MOTION_MS.calendarCell}ms`,
                  transitionTimingFunction: MOTION_EASING.smoothOut,
                }}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
