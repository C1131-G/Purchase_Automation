import { z } from "zod";

export const incomingPaymentListItemSchema = z.object({
  CardCode: z.string(),
  CardName: z.string(),
  CounterRef: z.string().nullable().optional(),
  DocCurr: z.string(),
  DocDate: z.string(),
  DocNum: z.number(),
  DocTotal: z.union([z.number(), z.string()]),
  PaymentMode: z.string().nullable().optional(),
  id: z.number(),
});

export const incomingPaymentListResponseSchema = z.object({
  data: z.array(incomingPaymentListItemSchema),
  limit: z.number(),
  page: z.number(),
  success: z.boolean(),
  total: z.number(),
  totalPages: z.number(),
});

export const incomingPaymentListParamsSchema = z.object({
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  CounterRef: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocNum: z.string().optional(),
  DocTotal: z.number().optional(),
  DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  sortBy: z.enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
