import { z } from "zod";

export const goodsIssueListItemSchema = z.object({
  DocEntry: z.number(),
  DocNum: z.number(),
  DocDate: z.string(),
  TaxDate: z.string(),
  Comments: z.string().nullable().optional(),
  DocTotal: z.number(),
  DocCurr: z.string().optional(),
  DocStatus: z.string(),
  id: z.number(),
});

export const goodsIssueListResponseSchema = z.object({
  data: z.array(goodsIssueListItemSchema),
  limit: z.number(),
  page: z.number(),
  success: z.boolean(),
  total: z.number(),
  totalPages: z.number(),
});

export const goodsIssueListParamsSchema = z.object({
  DocNum: z.string().optional(),
  Comments: z.string().optional(),
  DocStatus: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocDateEnd: z.string().optional(),
  TaxDateStart: z.string().optional(),
  TaxDateEnd: z.string().optional(),
  DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  DocTotal: z.number().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  sortBy: z.enum(["DocNum", "DocDate", "TaxDate", "DocTotal"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
