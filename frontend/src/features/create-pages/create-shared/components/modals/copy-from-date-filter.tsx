import { Calendar as LucideCalendar } from "lucide-react";

import { Calendar } from "@/components/calendar/calendar";
import { usePopover } from "@/components/context/popover-context";
import { Popover } from "@/components/popover";
import { toDateOnly } from "@/features/table-pages/table-shared/components/filters/search/table-search.utils";
import {
  type DateRangeFilter,
  toDateRangeFilter,
} from "@/features/table-pages/table-shared/utils/table-filter-values";
import { cn } from "@/shared/utils/cn";
import { MOTION_MS } from "@/shared/utils/motion";

export interface CopyFromDateFilterProps {
  dateFilterLabel: string;
  hasDateRange: boolean;
  selectedRange: { from?: Date; to?: Date };
  onDateSelect: (range: DateRangeFilter | undefined) => void;
}

interface CalendarRangeSelection {
  from?: Date | undefined;
  to?: Date | undefined;
}

const isCalendarRangeSelection = (value: unknown): value is CalendarRangeSelection => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as { from?: unknown; to?: unknown };
  const fromValid = candidate.from === undefined || candidate.from instanceof Date;
  const toValid = candidate.to === undefined || candidate.to instanceof Date;
  return fromValid && toValid;
};

function CopyFromDateFilterButton({
  dateFilterLabel,
  hasDateRange,
  selectedRange,
  onDateSelect,
}: CopyFromDateFilterProps) {
  const { setOpen } = usePopover();
  const today = new Date();
  const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const handleDateSelect = (value: unknown) => {
    if (!value) {
      onDateSelect(undefined);
      return;
    }
    if (!isCalendarRangeSelection(value)) {
      return;
    }
    const from = value.from ? toDateOnly(value.from) : undefined;
    const to = value.to ? toDateOnly(value.to) : undefined;
    const next = toDateRangeFilter(from, to);
    onDateSelect(next);
    if (from && to) {
      window.setTimeout(() => setOpen(false), MOTION_MS.calendarAutoClose);
    }
  };

  return (
    <>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 items-center rounded-full border px-3 text-xs font-medium transition hover:bg-zinc-50",
            hasDateRange
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-zinc-200 bg-white text-zinc-700",
          )}
        >
          <LucideCalendar className="mr-1.5 size-3.5" />
          {dateFilterLabel}
        </button>
      </Popover.Trigger>
      <Popover.Content align="end" className="p-0 will-change-transform" unstyled>
        <div className="p-3">
          <Calendar
            mode="range"
            maxDate={maxDate}
            selected={selectedRange}
            onSelect={handleDateSelect}
          />
        </div>
      </Popover.Content>
    </>
  );
}

export function CopyFromDateFilter(props: CopyFromDateFilterProps) {
  return (
    <Popover.Root>
      <CopyFromDateFilterButton {...props} />
    </Popover.Root>
  );
}
