import { z } from "zod";

export const BankDetailListQuerySchema = z.object({
  countryCode: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
});
