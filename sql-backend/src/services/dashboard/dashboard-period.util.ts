// Dashboard period — matching hana exactly.

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
  const [y, m, d] = value.split("-");
  return new Date(Date.UTC(Number(y ?? "1970"), Number(m ?? "1") - 1, Number(d ?? "1")));
};

const shiftDays = (value: string, days: number): string => {
  const date = fromDateOnly(value);
  date.setUTCDate(date.getUTCDate() + Number(days));
  return toDateOnly(date);
};

const startOfMonth = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
const startOfYear = (value: Date): Date => new Date(Date.UTC(value.getUTCFullYear(), 0, 1));

const startOfIsoWeek = (value: Date): Date => {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date;
};

const daysBetweenInclusive = (start: string, end: string): number => {
  const ms = fromDateOnly(end).getTime() - fromDateOnly(start).getTime();
  return Math.floor(ms / 86_400_000) + 1;
};

export const getPeriodWindow = (period: DashboardPeriod): PeriodWindow => {
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const currentEnd = toDateOnly(todayUtc);
  if (period === "all") {
    return {
      current: { end: null, start: null },
      granularity: "month",
      previous: null,
    };
  }
  const isWeekOrMonth = period === "week" || period === "month";
  let start: string;
  if (period === "week") {
    start = toDateOnly(startOfIsoWeek(todayUtc));
  } else if (period === "month") {
    start = toDateOnly(startOfMonth(todayUtc));
  } else {
    start = toDateOnly(startOfYear(todayUtc));
  }
  const days = daysBetweenInclusive(start, currentEnd);
  return {
    current: { end: currentEnd, start },
    granularity: isWeekOrMonth ? "day" : "month",
    previous: { end: shiftDays(start, -1), start: shiftDays(start, -days) },
  };
};

export const createBucketKey = (value: string, granularity: DashboardGranularity): string =>
  granularity === "day" ? value : value.slice(0, 7);

export const createBucketLabel = (bucket: string, granularity: DashboardGranularity): string => {
  if (granularity === "day") {
    return dayLabelFormatter.format(fromDateOnly(bucket));
  }
  const [y, m] = bucket.split("-");
  return monthLabelFormatter.format(
    new Date(Date.UTC(Number(y ?? "1970"), Number(m ?? "1") - 1, 1)),
  );
};
