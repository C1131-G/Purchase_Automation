import { z } from 'zod'

export const incomingPaymentListItemSchema = z.object({
  id: z.number(),
  DocNum: z.number(),
  DocDate: z.string(),
  CardCode: z.string(),
  CardName: z.string(),
  DocTotal: z.union([z.number(), z.string()]),
  DocCurr: z.string(),
  CounterRef: z.string().nullable().optional(),
  PaymentMode: z.string().nullable().optional(),
})

export const incomingPaymentListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(incomingPaymentListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export const incomingPaymentListParamsSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  DocNum: z.string().optional(),
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocTotalOperator: z.enum(['eq', 'lt', 'gt']).optional(),
  DocTotal: z.number().optional(),
  CounterRef: z.string().optional(),
  sortBy: z.enum(['DocNum', 'DocDate', 'CardCode', 'CardName', 'DocTotal']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})
