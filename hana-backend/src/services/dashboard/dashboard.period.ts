import type { DashboardPeriod, DashboardGranularity, PeriodWindow } from "./dashboard.types";

const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
});

const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

export const toDateOnly = (value: Date): string => value.toISOString().slice(0, 10);

export const fromDateOnly = (value: string): Date => {
  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number(yearPart ?? "1970");
  const month = Number(monthPart ?? "1");
  const day = Number(dayPart ?? "1");
  return new Date(Date.UTC(year, month - 1, day));
};

const shiftDays = (value: string, days: number): string => {
  const date = fromDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnly(date);
};

const startOfMonth = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));

const startOfYear = (value: Date): Date => new Date(Date.UTC(value.getUTCFullYear(), 0, 1));

const startOfIsoWeek = (value: Date): Date => {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const currentDay = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - currentDay + 1);
  return date;
};

const daysBetweenInclusive = (start: string, end: string): number => {
  const startDate = fromDateOnly(start);
  const endDate = fromDateOnly(end);
  const differenceMs = endDate.getTime() - startDate.getTime();
  return Math.floor(differenceMs / 86_400_000) + 1;
};

export const getPeriodWindow = (period: DashboardPeriod): PeriodWindow => {
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const currentEnd = toDateOnly(todayUtc);

  if (period === "all") {
    return {
      current: { start: null, end: null },
      previous: null,
      granularity: "month",
    };
  }

  const isWeekOrMonth = period === "week" || period === "month";
  const start =
    period === "week"
      ? toDateOnly(startOfIsoWeek(todayUtc))
      : period === "month"
        ? toDateOnly(startOfMonth(todayUtc))
        : toDateOnly(startOfYear(todayUtc));
  const days = daysBetweenInclusive(start, currentEnd);

  return {
    current: { start, end: currentEnd },
    previous: {
      start: shiftDays(start, -days),
      end: shiftDays(start, -1),
    },
    granularity: isWeekOrMonth ? "day" : "month",
  };
};

export const createBucketKey = (value: string, granularity: DashboardGranularity): string =>
  granularity === "day" ? value : value.slice(0, 7);

export const createBucketLabel = (bucket: string, granularity: DashboardGranularity): string => {
  if (granularity === "day") {
    return dayLabelFormatter.format(fromDateOnly(bucket));
  }

  const [yearPart, monthPart] = bucket.split("-");
  const year = Number(yearPart ?? "1970");
  const month = Number(monthPart ?? "1");
  return monthLabelFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
};
