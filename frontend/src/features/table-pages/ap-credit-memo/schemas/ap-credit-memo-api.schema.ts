import { z } from "zod";

export const apCreditMemoListItemSchema = z.object({
  BalanceDue: z.union([z.number(), z.string()]).optional(),
  CardCode: z.string(),
  CardName: z.string(),
  DocCurr: z.string(),
  DocDate: z.string(),
  DocNum: z.number(),
  DocStatus: z.enum(["Open", "Closed", "Draft"]),
  DocTotal: z.union([z.number(), z.string()]),
  id: z.number(),
});

export const apCreditMemoListResponseSchema = z.object({
  data: z.array(apCreditMemoListItemSchema),
  limit: z.number(),
  page: z.number(),
  success: z.boolean(),
  total: z.number(),
  totalPages: z.number(),
});

export const apCreditMemoListParamsSchema = z.object({
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocNum: z.string().optional(),
  DocStatus: z.enum(["Open", "Closed", "Draft"]).optional(),
  DocTotal: z.number().optional(),
  DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  sortBy: z.enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocStatus"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
