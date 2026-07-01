import { z } from "zod";

export const SalesEmployeeListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
  active: z.coerce.boolean().optional(),
});
