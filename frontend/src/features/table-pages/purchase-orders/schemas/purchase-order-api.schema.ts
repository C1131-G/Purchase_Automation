import { z } from 'zod'

export const purchaseOrderListItemSchema = z.object({
  id: z.number(),
  DocNum: z.number(),
  DocDate: z.string(),
  CardCode: z.string(),
  CardName: z.string(),
  DocTotal: z.union([z.number(), z.string()]),
  DocCurr: z.string(),
  DocStatus: z.enum(['Open', 'Partial', 'Closed']),
})

export const purchaseOrderListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(purchaseOrderListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export const purchaseOrderListParamsSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  DocNum: z.string().optional(),
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocStatus: z.enum(['Open', 'Partial', 'Closed']).optional(),
  DocDateStart: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocTotalOperator: z.enum(['eq', 'lt', 'gt']).optional(),
  DocTotal: z.number().optional(),
  sortBy: z.enum(['DocNum', 'DocDate', 'CardCode', 'CardName', 'DocTotal', 'DocStatus']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})
