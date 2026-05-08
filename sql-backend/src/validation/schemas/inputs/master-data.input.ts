import { z } from "@/config/zod";

export const MasterDataQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
  search: z.string().optional(),
});

export type MasterDataQuery = z.infer<typeof MasterDataQuerySchema>;
