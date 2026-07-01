// Item Master validation: Query input schemas for item-master routes.
// Mirrors hana-backend's ItemMasterQuerySchema and ItemMasterLookupQuerySchema.

import { z } from "zod";

export const ItemMasterQuerySchema = z.object({
  ItemCode: z.string().optional(),
  ItemName: z.string().optional(),
  frozenFor: z.string().optional(),
  validFor: z.string().optional(),
  ItmsGrpCod: z.coerce.number().int().optional(),
  InvntryUom: z.string().optional(),
  CodeBars: z.string().optional(),
  sortBy: z
    .enum(["ItemCode", "ItemName", "ItmsGrpCod", "OnHand", "AvgPrice", "InvntItem", "CodeBars"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const ItemMasterLookupQuerySchema = z.object({
  search: z.string().min(1).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100000).default(10),
});
