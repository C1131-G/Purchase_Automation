import { z } from "zod";

export const MasterDataQuerySchema = z.object({
  country: z.string().trim().optional(),
  itemCode: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  search: z.string().trim().optional(),
  type: z.enum(["sales", "purchase"]).optional(),
  warehouseCode: z.string().optional(),
});
