import { z } from "zod";

export const DashboardSummaryQuerySchema = z.object({
  range: z.enum(["weekly", "monthly", "yearly"]).optional().default("yearly"),
});

export const DashboardPeriodQuerySchema = z.object({
  period: z.enum(["week", "month", "year", "all"]).optional().default("month"),
});
