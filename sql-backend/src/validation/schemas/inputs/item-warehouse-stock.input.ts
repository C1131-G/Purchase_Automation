import { z } from "zod";

export const ItemWarehouseStockListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  itemCode: z.string().optional(),
  warehouseCode: z.string().optional(),
});
