import { z } from "zod";

export const BankDetailListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  countryCode: z.string().optional(),
  search: z.string().optional(),
});
