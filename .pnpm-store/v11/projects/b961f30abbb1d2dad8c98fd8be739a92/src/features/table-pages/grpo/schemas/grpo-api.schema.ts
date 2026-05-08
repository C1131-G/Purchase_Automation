import { z } from "zod";

export const grpoListItemSchema = z.object({
  CardCode: z.string(),
  CardName: z.string(),
  DocCurr: z.string(),
  DocDate: z.string(),
  DocNum: z.number(),
  DocStatus: z.enum(["Open", "Partial", "Closed"]),
  DocTotal: z.union([z.number(), z.string()]),
  id: z.number(),
});

export const grpoListResponseSchema = z.object({
  data: z.array(grpoListItemSchema),
  limit: z.number(),
  page: z.number(),
  success: z.boolean(),
  total: z.number(),
  totalPages: z.number(),
});

export const grpoListParamsSchema = z.object({
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocNum: z.string().optional(),
  DocStatus: z.enum(["Open", "Partial", "Closed"]).optional(),
  DocTotal: z.number().optional(),
  DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  sortBy: z.enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocStatus"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
