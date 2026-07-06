import { z } from "zod";

export const purchaseOrderListItemSchema = z.object({
  CardCode: z.string(),
  CardName: z.string().nullable(),
  DocCurr: z.string().nullable(),
  DocDate: z.string().nullable(),
  DocNum: z.number(),
  DocStatus: z.enum(["Open", "Partial", "Closed", "Draft"]),
  DocTotal: z.union([z.number(), z.string()]),
  id: z.number(),
});

export const purchaseOrderListResponseSchema = z.object({
  data: z.array(purchaseOrderListItemSchema),
  limit: z.number(),
  page: z.number(),
  success: z.boolean(),
  total: z.number(),
  totalPages: z.number(),
});

export const purchaseOrderListParamsSchema = z.object({
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocNum: z.string().optional(),
  DocStatus: z.enum(["Open", "Partial", "Closed", "Draft"]).optional(),
  DocTotal: z.number().optional(),
  DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  sortBy: z.enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocStatus"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
