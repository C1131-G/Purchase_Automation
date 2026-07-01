// Dashboard constants: Period labels, default ranges, aggregation config.

export const PERIOD_LABELS = {
  week: "This Week",
  month: "This Month",
  year: "This Year",
  all: "All Time",
} as const;

export const DASHBOARD_CACHE_TTL = 1000 * 60 * 5; // 5 minutes
