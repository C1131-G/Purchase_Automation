// Dashboard Input Validation: Schema for controlling the time granularity of analytics.

import { z } from "zod";

// DashboardSummaryQuerySchema: Controls the aggregation window for widgets.
export const DashboardSummaryQuerySchema = z.object({
  range: z.enum(["weekly", "monthly", "yearly"]).optional().default("yearly"),
});

export type DashboardSummaryQuery = z.infer<typeof DashboardSummaryQuerySchema>;
