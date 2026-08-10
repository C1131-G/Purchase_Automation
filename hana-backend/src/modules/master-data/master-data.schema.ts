// Master Data Query Validation: Schema for filtering read-only lookup data.

import { z } from "zod";

export const MasterDataQuerySchema = z.object({
  // search: Optional keyword for searching products, vendors, or customers.
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  warehouseCode: z.string().optional(),
  itemCode: z.string().trim().optional(),
  /** Comma-separated ItemCodes for products-by-codes (max 100 parsed server-side). */
  codes: z.string().trim().optional(),
  /** Comma-separated ItemCodes for product-warehouse-stocks-batch. */
  itemCodes: z.string().trim().optional(),
  type: z.enum(["sales", "purchase"]).optional(),
  country: z.string().trim().optional(),
  priceList: z.coerce.number().optional(),
  /** BP CardCode — required for product catalog (OSCN ∩ OITM). */
  cardCode: z.string().trim().optional(),
});

export type MasterDataQuery = z.infer<typeof MasterDataQuerySchema>;
