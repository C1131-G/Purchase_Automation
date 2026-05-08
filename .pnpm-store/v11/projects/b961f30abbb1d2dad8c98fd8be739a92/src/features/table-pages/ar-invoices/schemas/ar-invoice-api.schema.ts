import { z } from "zod";

export const arInvoiceListItemSchema = z.object({
  BalanceDue: z.union([z.number(), z.string()]),
  CardCode: z.string(),
  CardName: z.string(),
  DocCurr: z.string(),
  DocDate: z.string(),
  DocNum: z.number(),
  DocStatus: z.enum(["Open", "Closed"]),
  DocTotal: z.union([z.number(), z.string()]),
  NumAtCard: z.string().nullable().optional(),
  id: z.number(),
  paidSum: z.union([z.number(), z.string()]).optional(),
});

export const arInvoiceListResponseSchema = z.object({
  data: z.array(arInvoiceListItemSchema),
  limit: z.number(),
  page: z.number(),
  success: z.boolean(),
  total: z.number(),
  totalPages: z.number(),
});

export const arInvoiceListParamsSchema = z.object({
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocNum: z.string().optional(),
  DocStatus: z.enum(["Open", "Closed"]).optional(),
  DocTotal: z.number().optional(),
  DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  NumAtCard: z.string().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  paidSum: z.number().optional(),
  paidSumOperator: z.enum(["eq", "lt", "gt"]).optional(),
  sortBy: z
    .enum([
      "DocNum",
      "DocDate",
      "CardCode",
      "CardName",
      "DocTotal",
      "NumAtCard",
      "paidSum",
      "DocStatus",
    ])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
