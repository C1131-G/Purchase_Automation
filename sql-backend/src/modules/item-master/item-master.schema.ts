import { z } from "zod";

export const ItemMasterQuerySchema = z.object({
  CodeBars: z.string().optional(),
  InvntryUom: z.string().optional(),
  ItemCode: z.string().optional(),
  ItemName: z.string().optional(),
  ItmsGrpCod: z.coerce.number().int().optional(),
  frozenFor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  page: z.coerce.number().int().min(1).default(1),
  sortBy: z
    .enum(["ItemCode", "ItemName", "ItmsGrpCod", "OnHand", "AvgPrice", "InvntItem", "CodeBars"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  validFor: z.string().optional(),
});

export const ItemMasterLookupQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100_000).default(10),
  search: z.string().min(1).max(50).optional(),
});
