/** MONTHS: Display names for calendar months. */
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const DAYS = [
  { id: "sun", label: "S" },
  { id: "mon", label: "M" },
  { id: "tue", label: "T" },
  { id: "wed", label: "W" },
  { id: "thu", label: "T" },
  { id: "fri", label: "F" },
  { id: "sat", label: "S" },
] as const;

export const MIN_YEAR = 1900;
export const PICKER_ITEM_HEIGHT = 40;
export const PICKER_ITEM_GAP = 8;
export const PICKER_CONTAINER_HEIGHT = 228;
export const PICKER_VERTICAL_PADDING = 120;

export type CalendarMode = "single" | "range";
export interface CalendarDateRange {
  from?: Date | undefined;
  to?: Date | undefined;
}
export type DateRange = CalendarDateRange;
export type CalendarView = "grid" | "picker";
export interface DaySlot {
  key: string;
  day: number | null;
}

export interface CalendarProps {
  className?: string;
  mode?: CalendarMode;
  selected?: Date | CalendarDateRange | DateRange;
  onSelect?: (value: Date | CalendarDateRange | DateRange | undefined) => void;
  minDate?: Date | undefined;
  maxDate?: Date | undefined;
  numberOfMonths?: number;
  showMonthAndYearPickers?: boolean;
  "aria-label"?: string;
}

export const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();
export const getFirstDayOfMonth = (year: number, month: number) =>
  new Date(year, month, 1).getDay();
export const normalizeDate = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const isCalendarDateRange = (
  value: Date | CalendarDateRange | undefined,
): value is CalendarDateRange => Boolean(value) && !(value instanceof Date);
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
export const isBetweenInclusive = (target: Date, from: Date, to: Date) => {
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const z = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  const [start, end] = f <= z ? [f, z] : [z, f];
  return t >= start && t <= end;
};

export const createDaySlots = (year: number, month: number): DaySlot[] => {
  const daysInMonth = getDaysInMonth(year, month);
  const startDay = getFirstDayOfMonth(year, month);
  const grid: DaySlot[] = [];
  for (let slotNumber = 1; slotNumber <= startDay; slotNumber += 1) {
    grid.push({ day: null, key: `pad-${year}-${month + 1}-${slotNumber}` });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    grid.push({ day, key: `day-${year}-${month + 1}-${day}` });
  }
  return grid;
};
