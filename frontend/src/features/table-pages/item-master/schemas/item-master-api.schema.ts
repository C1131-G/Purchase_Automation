import { z } from "zod";

export const itemMasterListItemSchema = z.object({
  ItemCode: z.string(),
  ItemName: z.string(),
  FrgnName: z.string().nullable().optional(),
  ItmsGrpCod: z.number().nullable().optional(),
  InvntryUom: z.string().nullable().optional(),
  OnHand: z.number().nullable().optional(),
  IsCommited: z.number().nullable().optional(),
  OnOrder: z.number().nullable().optional(),
  AvgPrice: z.number().nullable().optional(),
  LastPurPrc: z.number().nullable().optional(),
  LastPurDat: z.string().nullable().optional(),
  ManBtchNum: z.string().nullable().optional(),
  ManSerNum: z.string().nullable().optional(),
  validFor: z.string().nullable().optional(),
  frozenFor: z.string().nullable().optional(),
  InvntItem: z.string().nullable().optional(),
  CodeBars: z.string().nullable().optional(),
  id: z.string(),
});

export const itemMasterListResponseSchema = z.object({
  data: z.array(itemMasterListItemSchema),
  limit: z.number(),
  page: z.number(),
  success: z.boolean(),
  total: z.number(),
  totalPages: z.number(),
});

export const itemMasterListParamsSchema = z.object({
  ItemCode: z.string().optional(),
  ItemName: z.string().optional(),
  frozenFor: z.string().optional(),
  validFor: z.string().optional(),
  ItmsGrpCod: z.number().optional(),
  InvntryUom: z.string().optional(),
  CodeBars: z.string().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  sortBy: z
    .enum(["ItemCode", "ItemName", "ItmsGrpCod", "OnHand", "AvgPrice", "InvntItem", "CodeBars"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
