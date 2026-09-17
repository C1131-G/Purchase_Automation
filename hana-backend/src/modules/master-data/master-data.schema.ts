// Master Data Query Validation: Schema for filtering read-only lookup data.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

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
  /** Enables PQ-only last purchase currency normalization. */
  catalog: z.literal("purchase-quotation").optional(),
  scope: z.literal("intercompany").optional(),
});

export type MasterDataQuery = z.infer<typeof MasterDataQuerySchema>;

/** DSC1 (chart of accounts) lookup used by document line-item account pickers. */
export const AccountQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .openapi({ description: "Search by Account name", example: "Cash" }),
  limit: z.coerce.number().int().positive().max(100).default(20).optional(),
});

export type AccountQuery = z.infer<typeof AccountQuerySchema>;
