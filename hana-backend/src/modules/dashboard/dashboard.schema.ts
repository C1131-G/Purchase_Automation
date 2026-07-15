// Dashboard Input Validation: Schemas for controlling the time granularity of analytics.

import { z } from "zod";

// DashboardSummaryQuerySchema: Controls the aggregation window for widgets (backward compatibility).
export const DashboardSummaryQuerySchema = z.object({
  range: z.enum(["weekly", "monthly", "yearly"]).optional().default("yearly"),
});

export type DashboardSummaryQuery = z.infer<typeof DashboardSummaryQuerySchema>;

// DashboardPeriodQuerySchema: Controls the period window for the new recreated dashboard.
export const DashboardPeriodQuerySchema = z.object({
  period: z.enum(["week", "month", "year", "all"]).optional().default("month"),
});

export type DashboardPeriodQuery = z.infer<typeof DashboardPeriodQuerySchema>;
