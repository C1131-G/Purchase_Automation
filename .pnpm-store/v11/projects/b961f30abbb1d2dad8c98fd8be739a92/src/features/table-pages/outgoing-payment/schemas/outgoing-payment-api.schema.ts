import { z } from "zod";

export const outgoingPaymentListItemSchema = z.object({
  CardCode: z.string(),
  CardName: z.string(),
  DocCurr: z.string(),
  DocDate: z.string(),
  DocNum: z.number(),
  DocTotal: z.union([z.number(), z.string()]),
  PaymentMode: z.string().optional(),
  id: z.number(),
});

export const outgoingPaymentListResponseSchema = z.object({
  data: z.array(outgoingPaymentListItemSchema),
  limit: z.number(),
  page: z.number(),
  success: z.boolean(),
  total: z.number(),
  totalPages: z.number(),
});

export const outgoingPaymentListParamsSchema = z.object({
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocNum: z.string().optional(),
  DocTotal: z.number().optional(),
  DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  PaymentMode: z.enum(["M-Pesa", "My Cash", "EFTPOS", "Direct Pay", "CASH"]).optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  sortBy: z
    .enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "PaymentMode"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
