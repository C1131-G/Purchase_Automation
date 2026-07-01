import { z } from "zod";

export const MasterDataQuerySchema = z.object({
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  warehouseCode: z.string().optional(),
  itemCode: z.string().trim().optional(),
  type: z.enum(["sales", "purchase"]).optional(),
  country: z.string().trim().optional(),
});
