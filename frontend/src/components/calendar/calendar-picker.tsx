import { useEffect, useRef, useState } from "react";

import { cn } from "@/shared/utils/cn";
import { MOTION_EASING, MOTION_MS } from "@/shared/utils/motion";

import {
  MONTHS,
  PICKER_CONTAINER_HEIGHT,
  PICKER_ITEM_GAP,
  PICKER_ITEM_HEIGHT,
  PICKER_VERTICAL_PADDING,
} from "./calendar.shared";
import type { CalendarView } from "./calendar.shared";

interface CalendarPickerProps {
  view: CalendarView;
  year: number;
  month: number;
  years: number[];
  minBoundary: Date | undefined;
  maxBoundary: Date | undefined;
  onDateChange: (date: Date) => void;
  onSwitchToGrid: () => void;
}

/**
 * CalendarPicker: Scrollable month and year selector.
 * UX: Uses smooth-scroll synchronization to align center-item with current selection.
 * PERFORMANCE: Implements RequestAnimationFrame (RAF) for efficient scroll tracking.
 */
export function CalendarPicker({
  view,
  year,
  month,
  years,
  minBoundary,
  maxBoundary,
  onDateChange,
  onSwitchToGrid,
}: CalendarPickerProps) {
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const yearScrollRef = useRef<HTMLDivElement>(null);
  const monthScrollRafRef = useRef<number | null>(null);
  const yearScrollRafRef = useRef<number | null>(null);
  const monthScrollEndTimerRef = useRef<number | null>(null);
  const yearScrollEndTimerRef = useRef<number | null>(null);
  const hasSyncedPickerOpenRef = useRef(false);
  const [isPickerScrolling, setIsPickerScrolling] = useState(false);

  useEffect(() => {
    if (view !== "picker") {
      hasSyncedPickerOpenRef.current = false;
      return;
    }
    if (hasSyncedPickerOpenRef.current) {
      return;
    }
    hasSyncedPickerOpenRef.current = true;

    const scrollToItem = (ref: React.RefObject<HTMLDivElement | null>, index: number) => {
      if (!ref.current) {
        return;
      }
      const itemCenter =
        PICKER_VERTICAL_PADDING +
        index * (PICKER_ITEM_HEIGHT + PICKER_ITEM_GAP) +
        PICKER_ITEM_HEIGHT / 2;
      const scrollTop = itemCenter - PICKER_CONTAINER_HEIGHT / 2;
      ref.current.scrollTo({ behavior: "smooth", top: scrollTop });
    };

    const timer = setTimeout(() => {
      scrollToItem(monthScrollRef, month);
      const yearIndex = years.indexOf(year);
      if (yearIndex !== -1) {
        scrollToItem(yearScrollRef, yearIndex);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [view, month, year, years]);

  useEffect(
    () => () => {
      if (monthScrollRafRef.current !== null) {
        cancelAnimationFrame(monthScrollRafRef.current);
      }
      if (yearScrollRafRef.current !== null) {
        cancelAnimationFrame(yearScrollRafRef.current);
      }
      if (monthScrollEndTimerRef.current !== null) {
        window.clearTimeout(monthScrollEndTimerRef.current);
      }
      if (yearScrollEndTimerRef.current !== null) {
        window.clearTimeout(yearScrollEndTimerRef.current);
      }
    },
    [],
  );

  return (
    <div className="flex h-full relative">
      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-10 bg-teal-50 rounded-xl mx-2 pointer-events-none z-0 border border-teal-100" />

      <div
        ref={monthScrollRef}
        onScroll={() => {
          setIsPickerScrolling(true);
          if (monthScrollEndTimerRef.current !== null) {
            window.clearTimeout(monthScrollEndTimerRef.current);
          }
          monthScrollEndTimerRef.current = window.setTimeout(() => {
            setIsPickerScrolling(false);
          }, 140);
          if (monthScrollRafRef.current !== null) {
            return;
          }
          monthScrollRafRef.current = requestAnimationFrame(() => {
            monthScrollRafRef.current = null;
            const container = monthScrollRef.current;
            if (!container) {
              return;
            }

            const step = PICKER_ITEM_HEIGHT + PICKER_ITEM_GAP;
            const centerOffset =
              container.scrollTop + PICKER_CONTAINER_HEIGHT / 2 - PICKER_VERTICAL_PADDING;
            const monthIndex = Math.round((centerOffset - PICKER_ITEM_HEIGHT / 2) / step);
            const clampedMonth = Math.max(0, Math.min(11, monthIndex));
            const minMonthForYear =
              minBoundary && year === minBoundary.getFullYear() ? minBoundary.getMonth() : 0;
            const maxMonthForYear =
              maxBoundary && year === maxBoundary.getFullYear() ? maxBoundary.getMonth() : 11;
            const nextMonth = Math.max(minMonthForYear, Math.min(clampedMonth, maxMonthForYear));

            if (nextMonth !== month) {
              onDateChange(new Date(year, nextMonth, 1));
            }
          });
        }}
        className="flex-1 overflow-y-auto py-30 scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="flex flex-col items-center gap-2">
          {MONTHS.map((m, index) => {
            const beforeMin =
              minBoundary &&
              (year < minBoundary.getFullYear() ||
                (year === minBoundary.getFullYear() && index < minBoundary.getMonth()));
            const afterMax =
              maxBoundary &&
              (year > maxBoundary.getFullYear() ||
                (year === maxBoundary.getFullYear() && index > maxBoundary.getMonth()));
            const isMonthDisabled = Boolean(beforeMin || afterMax);

            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onDateChange(new Date(year, index, 1));
                  onSwitchToGrid();
                }}
                disabled={isMonthDisabled}
                className={cn(
                  "h-10 w-full flex items-center justify-center z-10 transition-colors cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0",
                  isMonthDisabled && "text-neutral-300 cursor-not-allowed",
                  index === month ? "text-teal-700 font-bold text-lg" : "text-teal-300",
                )}
                style={{
                  transitionDuration: isPickerScrolling ? "0ms" : `${MOTION_MS.calendarList}ms`,
                  transitionTimingFunction: MOTION_EASING.smoothOut,
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={yearScrollRef}
        onScroll={() => {
          setIsPickerScrolling(true);
          if (yearScrollEndTimerRef.current !== null) {
            window.clearTimeout(yearScrollEndTimerRef.current);
          }
          yearScrollEndTimerRef.current = window.setTimeout(() => {
            setIsPickerScrolling(false);
          }, 140);
          if (yearScrollRafRef.current !== null) {
            return;
          }
          yearScrollRafRef.current = requestAnimationFrame(() => {
            yearScrollRafRef.current = null;
            const container = yearScrollRef.current;
            if (!container) {
              return;
            }

            const step = PICKER_ITEM_HEIGHT + PICKER_ITEM_GAP;
            const centerOffset =
              container.scrollTop + PICKER_CONTAINER_HEIGHT / 2 - PICKER_VERTICAL_PADDING;
            const yearIndex = Math.round((centerOffset - PICKER_ITEM_HEIGHT / 2) / step);
            const clampedIndex = Math.max(0, Math.min(years.length - 1, yearIndex));
            const nextYear = years[clampedIndex];
            if (!nextYear) {
              return;
            }

            const minMonthForYear =
              minBoundary && nextYear === minBoundary.getFullYear() ? minBoundary.getMonth() : 0;
            const maxMonthForYear =
              maxBoundary && nextYear === maxBoundary.getFullYear() ? maxBoundary.getMonth() : 11;
            const nextMonth = Math.max(minMonthForYear, Math.min(month, maxMonthForYear));

            if (nextYear !== year || nextMonth !== month) {
              onDateChange(new Date(nextYear, nextMonth, 1));
            }
          });
        }}
        className="flex-1 overflow-y-auto py-30 scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="flex flex-col items-center gap-2">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                onDateChange(new Date(y, month, 1));
                onSwitchToGrid();
              }}
              className={cn(
                "h-10 w-full flex items-center justify-center z-10 transition-colors cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0",
                y === year ? "text-teal-700 font-bold text-lg" : "text-teal-300",
              )}
              style={{
                transitionDuration: isPickerScrolling ? "0ms" : `${MOTION_MS.calendarList}ms`,
                transitionTimingFunction: MOTION_EASING.smoothOut,
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
