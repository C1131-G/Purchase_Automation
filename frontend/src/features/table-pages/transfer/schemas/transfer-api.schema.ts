import { z } from "zod";

export const transferListItemSchema = z.object({
  DocEntry: z.number(),
  DocNum: z.number(),
  DocDate: z.string(),
  Comments: z.string().nullable().optional(),
  Filler: z.string().nullable().optional(),
  ToWhsCode: z.string().nullable().optional(),
  DocTotal: z.number(),
  DocCurr: z.string().optional(),
  DocStatus: z.string(),
  id: z.number(),
});

export const transferListResponseSchema = z.object({
  data: z.array(transferListItemSchema),
  limit: z.number(),
  page: z.number(),
  success: z.boolean(),
  total: z.number(),
  totalPages: z.number(),
});

export const transferListParamsSchema = z.object({
  DocNum: z.string().optional(),
  Comments: z.string().optional(),
  DocStatus: z.string().optional(),
  Filler: z.string().optional(),
  ToWhsCode: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  DocTotal: z.number().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  sortBy: z.enum(["DocNum", "DocDate", "Filler", "ToWhsCode", "DocTotal"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
