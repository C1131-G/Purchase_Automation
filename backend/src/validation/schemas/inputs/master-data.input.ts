// Master Data Query Validation: Schema for filtering read-only lookup data.

import { z } from "zod";

export const MasterDataQuerySchema = z.object({
  // search: Optional keyword for searching products, vendors, or customers.
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  warehouseCode: z.string().optional(),
  itemCode: z.string().trim().optional(),
});

export type MasterDataQuery = z.infer<typeof MasterDataQuerySchema>;
