import { z } from "@/config/zod";

export const DashboardSummaryQuerySchema = z.object({
  range: z.enum(["week", "month", "quarter", "year"]).optional(),
});

export type DashboardSummaryQuery = z.infer<typeof DashboardSummaryQuerySchema>;
