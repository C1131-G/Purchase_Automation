import { z } from "zod";

export const WarehouseListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
  inactive: z.coerce.boolean().optional(),
});

export const WarehouseGetParamSchema = z.object({
  code: z.string().min(1),
});
