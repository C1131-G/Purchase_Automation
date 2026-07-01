import { z } from "zod";

export const AccountQuerySchema = z.object({
  search: z.string().trim().min(1).max(50).optional(),
  limit: z.coerce.number().int().positive().max(500).default(500).optional(),
});
