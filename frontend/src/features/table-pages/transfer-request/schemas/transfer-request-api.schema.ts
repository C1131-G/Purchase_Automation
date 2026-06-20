import { z } from "zod";

export const transferRequestListItemSchema = z.object({
  DocEntry: z.number(),
  DocNum: z.number(),
  DocDate: z.string(),
  Comments: z.string().nullable().optional(),
  DocTotal: z.number(),
  DocCurr: z.string().optional(),
  DocStatus: z.string(),
  Filler: z.string().nullable().optional(),
  ToWhsCode: z.string().nullable().optional(),
  id: z.number(),
});

export const transferRequestListResponseSchema = z.object({
  data: z.array(transferRequestListItemSchema),
  limit: z.number(),
  page: z.number(),
  success: z.boolean(),
  total: z.number(),
  totalPages: z.number(),
});

export const transferRequestListParamsSchema = z.object({
  DocNum: z.string().optional(),
  Comments: z.string().optional(),
  DocStatus: z.string().optional(),
  Filler: z.string().optional(),
  ToWhsCode: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocTotal: z.number().optional(),
  DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  sortBy: z.enum(["DocNum", "DocDate", "DocStatus", "DocTotal", "Filler", "ToWhsCode"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
