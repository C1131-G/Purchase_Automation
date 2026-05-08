import { z } from "@/config/zod";

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
  search: z.string().optional(),
});

export const IdParamSchema = z.object({
  id: z.string().min(1),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type IdParam = z.infer<typeof IdParamSchema>;
